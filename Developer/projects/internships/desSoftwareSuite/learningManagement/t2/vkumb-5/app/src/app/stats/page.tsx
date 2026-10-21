import { useState, useEffect } from "react"
import { BarChart3, Users, TrendingUp, Award, Loader2, AlertCircle, CalendarDays, GraduationCap, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { adminApi, sessionApi } from "@/lib/api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#8b5cf6']

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [statsData, sessionsData] = await Promise.all([
        adminApi.getStats(),
        sessionApi.getSessions(),
      ])
      setStats(statsData)
      setSessions(sessionsData)
    } catch (e: any) {
      setError("Failed to load statistics")
    } finally {
      setIsLoading(false)
    }
  }

  const sessionAttendanceData = sessions.map(s => ({
    name: s.name.length > 20 ? s.name.slice(0, 20) + '...' : s.name,
    enrolled: s.enrolled,
    attended: s.attended,
    capacity: s.capacity,
  }))

  const statusData = [
    { name: 'Completed', value: sessions.filter(s => s.status === 'completed').length },
    { name: 'In Progress', value: sessions.filter(s => s.status === 'in_progress').length },
    { name: 'Scheduled', value: sessions.filter(s => s.status === 'scheduled').length },
  ].filter(d => d.value > 0)

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Statistics</h1>
          <p className="text-muted-foreground">View attendance and performance statistics</p>
        </div>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg"><Users className="h-5 w-5 text-blue-500" /></div>
                <div><p className="text-2xl font-bold">{stats.totalVolunteers}</p><p className="text-xs text-muted-foreground">Total Volunteers</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
                <div><p className="text-2xl font-bold">{stats.avgAttendance}%</p><p className="text-xs text-muted-foreground">Avg Attendance</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg"><GraduationCap className="h-5 w-5 text-purple-500" /></div>
                <div><p className="text-2xl font-bold">{stats.examPassRate}%</p><p className="text-xs text-muted-foreground">Exam Pass Rate</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg"><Award className="h-5 w-5 text-orange-500" /></div>
                <div><p className="text-2xl font-bold">{stats.certificatesIssued}</p><p className="text-xs text-muted-foreground">Certificates</p></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Session Attendance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Session Attendance
              </CardTitle>
              <CardDescription>Enrolled vs Attended per session</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sessionAttendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="enrolled" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attended" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Session Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                Session Status
              </CardTitle>
              <CardDescription>Distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Session Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" />
              Session Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Session</th>
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-right py-2 px-3 font-medium">Enrolled</th>
                    <th className="text-right py-2 px-3 font-medium">Attended</th>
                    <th className="text-right py-2 px-3 font-medium">Rate</th>
                    <th className="text-left py-2 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{s.name}</td>
                      <td className="py-2 px-3">{s.date}</td>
                      <td className="py-2 px-3 text-right">{s.enrolled}</td>
                      <td className="py-2 px-3 text-right">{s.attended}</td>
                      <td className="py-2 px-3 text-right">{s.enrolled > 0 ? Math.round((s.attended / s.enrolled) * 100) : 0}%</td>
                      <td className="py-2 px-3">
                        <Badge variant={s.status === 'completed' ? 'success' : s.status === 'in_progress' ? 'default' : 'secondary'} className="capitalize">
                          {s.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
