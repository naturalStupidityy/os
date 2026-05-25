import { useState, useEffect } from "react"
import { ClipboardList, Users, XCircle, Loader2, AlertCircle, RefreshCw, Search, Filter, CheckCircle2, UserCheck, UserX, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { sessionApi, attendanceApi } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

export default function RosterPage() {
  const { user } = useAuthStore()
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [roster, setRoster] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isMarking, setIsMarking] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showMarkDialog, setShowMarkDialog] = useState(false)
  const [markTarget, setMarkTarget] = useState<any>(null)
  const [markAction, setMarkAction] = useState<"present" | "absent">("present")
  const [manualReason, setManualReason] = useState("")

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (selectedSessionId) {
      loadRoster(selectedSessionId)
    }
  }, [selectedSessionId])

  const loadSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const data = await sessionApi.getSessions()
      setSessions(data)
      if (data.length > 0) setSelectedSessionId(data[0].id)
    } catch (e: any) {
      setError("Failed to load sessions: " + (e.message || "Unknown error"))
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const loadRoster = async (sessionId: string) => {
    setIsLoading(true)
    setError("")
    try {
      const [rosterData, statsData] = await Promise.all([
        attendanceApi.getRoster(sessionId),
        attendanceApi.getStats(sessionId),
      ])
      setRoster(rosterData)
      setStats(statsData)
    } catch (e: any) {
      setError("Failed to load roster data: " + (e.message || "Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }

  const openMarkDialog = (record: any, action: "present" | "absent") => {
    setMarkTarget(record)
    setMarkAction(action)
    setManualReason("")
    setShowMarkDialog(true)
  }

  const handleManualMark = async () => {
    if (!markTarget || !selectedSessionId) return
    setIsMarking(markTarget.userId)
    setShowMarkDialog(false)
    try {
      const selectedSession = sessions.find(s => s.id === selectedSessionId)
      const result = await attendanceApi.manualCheckIn({
        sessionId: selectedSessionId,
        eventId: selectedSession?.eventId || "",
        userId: markTarget.userId,
        userName: markTarget.userName,
        status: markAction,
        reason: manualReason || `Manually marked ${markAction} by ${user?.name || 'instructor'}`,
      })

      if (result.success) {
        // Refresh roster data
        await loadRoster(selectedSessionId)
      } else {
        setError("Failed to mark attendance: " + (result.message || "Unknown error"))
      }
    } catch (e: any) {
      setError(e.message || `Failed to mark ${markAction}`)
    } finally {
      setIsMarking(null)
    }
  }

  const filteredRoster = roster.filter((r) => {
    const matchesSearch = !searchQuery || r.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || r.vid?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const selectedSession = sessions.find(s => s.id === selectedSessionId)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge variant="success" className="capitalize">{status}</Badge>
      case 'absent': return <Badge variant="destructive" className="capitalize">{status}</Badge>
      case 'late': return <Badge className="bg-yellow-500 capitalize">{status}</Badge>
      case 'excused': return <Badge className="bg-blue-500 capitalize"><Shield className="h-3 w-3 mr-1" />{status}</Badge>
      default: return <Badge variant="outline" className="capitalize">{status}</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Roster Management</h1>
          <p className="text-muted-foreground">Manage volunteer attendance rosters and perform manual overrides</p>
        </div>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Session Selector & Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Select Session</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId} disabled={isLoadingSessions}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose session..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSession && (
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p>Date: {selectedSession.date}</p>
                  <p>Time: {selectedSession.timeStart} - {selectedSession.timeEnd}</p>
                  <p>Venue: {selectedSession.venue}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {stats && (
            <>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-lg"><Users className="h-5 w-5 text-green-500" /></div>
                  <div><p className="text-2xl font-bold">{stats.present}</p><p className="text-xs text-muted-foreground">Present</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 rounded-lg"><XCircle className="h-5 w-5 text-red-500" /></div>
                  <div><p className="text-2xl font-bold">{stats.absent}</p><p className="text-xs text-muted-foreground">Absent</p></div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Detailed Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-muted/50"><CardContent className="p-3 text-center"><p className="text-lg font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Enrolled</p></CardContent></Card>
            <Card className="bg-green-50"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-green-600">{stats.percentage}%</p><p className="text-xs text-muted-foreground">Attendance Rate</p></CardContent></Card>
            <Card className="bg-yellow-50"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-yellow-600">{stats.late}</p><p className="text-xs text-muted-foreground">Late</p></CardContent></Card>
            <Card className="bg-blue-50"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-blue-600">{stats.byMethod?.qr || 0}</p><p className="text-xs text-muted-foreground">QR Check-ins</p></CardContent></Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or VID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="excused">Excused</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => selectedSessionId && loadRoster(selectedSessionId)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Roster List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
            <p className="text-muted-foreground">Loading roster...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-orange-500" />
                Attendance Roster
                <span className="text-sm font-normal text-muted-foreground">({filteredRoster.length} volunteers)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Volunteer</th>
                      <th className="text-left py-2 px-3 font-medium hidden md:table-cell">VID</th>
                      <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Method</th>
                      <th className="text-left py-2 px-3 font-medium hidden lg:table-cell">Check-in Time</th>
                      <th className="text-right py-2 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((r) => (
                      <tr key={r.userId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3">{getStatusBadge(r.status)}</td>
                        <td className="py-2 px-3 font-medium">{r.userName}</td>
                        <td className="py-2 px-3 font-mono text-xs hidden md:table-cell">{r.vid}</td>
                        <td className="py-2 px-3 hidden sm:table-cell">
                          <Badge variant="outline" className="capitalize">{r.checkInMethod || 'N/A'}</Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground hidden lg:table-cell">
                          {r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : '-'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.status === 'absent' || r.status === 'late' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                onClick={() => openMarkDialog(r, "present")}
                                disabled={isMarking === r.userId}
                              >
                                {isMarking === r.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3 mr-1" />}
                                Mark Present
                              </Button>
                            ) : r.status === 'present' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                onClick={() => openMarkDialog(r, "absent")}
                                disabled={isMarking === r.userId}
                              >
                                {isMarking === r.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3 mr-1" />}
                                Mark Absent
                              </Button>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  onClick={() => openMarkDialog(r, "present")}
                                  disabled={isMarking === r.userId}
                                >
                                  {isMarking === r.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                  onClick={() => openMarkDialog(r, "absent")}
                                  disabled={isMarking === r.userId}
                                >
                                  {isMarking === r.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRoster.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          No volunteers found for this session.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Manual Mark Dialog */}
      <Dialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {markAction === "present" ? "Mark as Present" : "Mark as Absent"}
            </DialogTitle>
            <DialogDescription>
              {markTarget && `Override attendance for ${markTarget.userName} (${markTarget.vid || markTarget.userId})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                placeholder="e.g., Volunteer arrived late, verified by instructor"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Session: {selectedSession?.name}
              <br />
              This action will be logged with your instructor ID.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkDialog(false)}>Cancel</Button>
            <Button
              onClick={handleManualMark}
              className={markAction === "present" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {markAction === "present" ? (
                <><UserCheck className="h-4 w-4 mr-2" />Confirm Mark Present</>
              ) : (
                <><UserX className="h-4 w-4 mr-2" />Confirm Mark Absent</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
