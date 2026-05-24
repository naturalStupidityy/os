import { useState, useEffect } from "react"
import { Shield, Users, CheckCircle2, Clock, Award, BookOpen, Loader2, AlertCircle, Activity, Zap, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { adminApi, sessionApi } from "@/lib/api"
import { Link } from "react-router-dom"

export default function CommandCenterPage() {
  const [stats, setStats] = useState<any>(null)
  const [apiStatus, setApiStatus] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [statsData, statusData, sessionsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getAPIStatus(),
        sessionApi.getSessions(),
      ])
      setStats(statsData)
      setApiStatus(statusData)
      setSessions(sessionsData)
    } catch (e: any) {
      setError("Failed to load command center data")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="text-muted-foreground">Loading command center...</p>
        </div>
      </DashboardLayout>
    )
  }

  const operationalCount = apiStatus.filter(s => s.status === 'operational').length
  const totalServices = apiStatus.length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="text-muted-foreground">Admin overview and monitoring dashboard</p>
        </div>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* System Health Banner */}
        <Card className={operationalCount === totalServices ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className={`h-6 w-6 ${operationalCount === totalServices ? 'text-green-600' : 'text-yellow-600'}`} />
                <div>
                  <p className="font-semibold">System Status</p>
                  <p className="text-sm text-muted-foreground">
                    {operationalCount}/{totalServices} services operational
                  </p>
                </div>
              </div>
              <Badge variant={operationalCount === totalServices ? "success" : "warning"} className="text-sm">
                {operationalCount === totalServices ? 'All Systems Go' : 'Degraded'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-lg"><Users className="h-5 w-5 text-blue-500" /></div>
                    <div><p className="text-2xl font-bold">{stats.totalVolunteers}</p><p className="text-xs text-muted-foreground">Volunteers</p></div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
                    <div><p className="text-2xl font-bold">{stats.avgAttendance}%</p><p className="text-xs text-muted-foreground">Attendance</p></div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 rounded-lg"><BookOpen className="h-5 w-5 text-purple-500" /></div>
                    <div><p className="text-2xl font-bold">{stats.examPassRate}%</p><p className="text-xs text-muted-foreground">Pass Rate</p></div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-500/10 rounded-lg"><Award className="h-5 w-5 text-orange-500" /></div>
                    <div><p className="text-2xl font-bold">{stats.certificatesIssued}</p><p className="text-xs text-muted-foreground">Certificates</p></div>
                  </div>
                  <Zap className="h-4 w-4 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/config">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg"><Shield className="h-5 w-5 text-orange-500" /></div>
                <div><p className="font-medium">System Configuration</p><p className="text-xs text-muted-foreground">Manage all settings</p></div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg"><Users className="h-5 w-5 text-blue-500" /></div>
                <div><p className="font-medium">User Management</p><p className="text-xs text-muted-foreground">{stats?.totalVolunteers || 0} users</p></div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/api-status">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg"><Activity className="h-5 w-5 text-green-500" /></div>
                <div><p className="font-medium">API Status</p><p className="text-xs text-muted-foreground">{operationalCount}/{totalServices} operational</p></div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Session Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Session Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats?.completedSessions || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats?.inProgressSessions || 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{stats?.upcomingSessions || 0}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>

            <div className="space-y-2">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${s.status === 'completed' ? 'bg-green-500' : s.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{s.attended}/{s.enrolled} attended</span>
                    <Badge variant="outline" className="capitalize">{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Status Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {apiStatus.slice(0, 5).map((service) => (
                <div key={service.name} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${service.status === 'operational' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <span className="text-sm">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{service.latency}</span>
                    <Badge variant={service.status === 'operational' ? 'success' : 'warning'} className="capitalize">{service.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
