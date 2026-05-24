import { useState, useEffect } from "react"
import { ClipboardList, Users, XCircle, Loader2, AlertCircle, RefreshCw, Search, Filter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { sessionApi, attendanceApi } from "@/lib/api"

export default function RosterPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [attendance, setAttendance] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (selectedSessionId) {
      loadAttendance(selectedSessionId)
    }
  }, [selectedSessionId])

  const loadSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const data = await sessionApi.getSessions()
      setSessions(data)
      if (data.length > 0) setSelectedSessionId(data[0].id)
    } catch (e: any) {
      setError("Failed to load sessions")
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const loadAttendance = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const [attData, statsData] = await Promise.all([
        sessionApi.getSessionAttendance(sessionId),
        attendanceApi.getStats(sessionId),
      ])
      setAttendance(attData)
      setStats(statsData)
    } catch (e: any) {
      setError("Failed to load attendance data")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAttendance = attendance.filter((a) => {
    const matchesSearch = !searchQuery || a.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || a.userId?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const selectedSession = sessions.find(s => s.id === selectedSessionId)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge variant="success" className="capitalize">{status}</Badge>
      case 'absent': return <Badge variant="destructive" className="capitalize">{status}</Badge>
      case 'late': return <Badge className="bg-yellow-500 capitalize">{status}</Badge>
      default: return <Badge variant="outline" className="capitalize">{status}</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Roster Management</h1>
          <p className="text-muted-foreground">Manage volunteer attendance rosters</p>
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
              placeholder="Search by name or ID..."
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
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => selectedSessionId && loadAttendance(selectedSessionId)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Attendance List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
            <p className="text-muted-foreground">Loading attendance...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-orange-500" />
                Attendance Roster
                <span className="text-sm font-normal text-muted-foreground">({filteredAttendance.length} records)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Volunteer</th>
                      <th className="text-left py-2 px-3 font-medium hidden md:table-cell">User ID</th>
                      <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Method</th>
                      <th className="text-left py-2 px-3 font-medium hidden lg:table-cell">Check-in Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map((a) => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3">{getStatusBadge(a.status)}</td>
                        <td className="py-2 px-3 font-medium">{a.userName}</td>
                        <td className="py-2 px-3 font-mono text-xs hidden md:table-cell">{a.userId}</td>
                        <td className="py-2 px-3 hidden sm:table-cell">
                          <Badge variant="outline" className="capitalize">{a.checkInMethod || 'N/A'}</Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground hidden lg:table-cell">
                          {a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString() : '-'}
                        </td>
                      </tr>
                    ))}
                    {filteredAttendance.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          No attendance records found.
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
    </DashboardLayout>
  )
}
