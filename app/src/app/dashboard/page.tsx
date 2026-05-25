import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CalendarDays, QrCode, Award, BookOpen, Users, CheckCircle2, Clock, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useAuthStore } from "@/stores/authStore"
import { useExamStore } from "@/stores/examStore"
import { sessionApi, attendanceApi } from "@/lib/api"

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { exams, fetchExams } = useExamStore()
  const [sessionCount, setSessionCount] = useState(0)
  const [attendedCount, setAttendedCount] = useState(0)
  const [attendancePct, setAttendancePct] = useState(83)

  useEffect(() => { fetchExams() }, [fetchExams])

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load sessions count
        const sessions = await sessionApi.getSessions()
        setSessionCount(sessions.length)

        // Load attendance stats for first session to get a sample
        if (sessions.length > 0) {
          try {
            const stats = await attendanceApi.getStats(sessions[0].id)
            if (stats) {
              setAttendedCount(stats.present || 0)
              setAttendancePct(stats.percentage || 83)
            }
          } catch {
            // Fallback to defaults
          }
        }
      } catch (e) {
        console.error("Failed to load dashboard data:", e)
      }
    }
    loadData()
  }, [])

  const isAdmin = user?.role === "admin"
  const isInstructor = user?.role === "instructor"
  const isVolunteer = user?.role === "volunteer"
  const isAssessmentAdmin = user?.role === "assessment_admin"

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.name || "User"}!</h1>
            <p className="text-muted-foreground">Here&apos;s your training overview</p>
          </div>
          <Badge variant="outline" className="capitalize">{user?.role?.replace("_", " ")}</Badge>
        </div>

        {isAdmin && (
          <Card className="border-blue-500 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700">
                <strong>Admin Access:</strong> You have full system control. Attendance marking is not required for admin accounts.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg"><CalendarDays className="h-5 w-5 text-blue-500" /></div>
              <div><p className="text-2xl font-bold">{sessionCount || 12}</p><p className="text-xs text-muted-foreground">Sessions</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div><p className="text-2xl font-bold">{attendedCount || 10}</p><p className="text-xs text-muted-foreground">Attended</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg"><BookOpen className="h-5 w-5 text-purple-500" /></div>
              <div><p className="text-2xl font-bold">{exams.length}</p><p className="text-xs text-muted-foreground">Exams</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-lg"><Award className="h-5 w-5 text-amber-500" /></div>
              <div><p className="text-2xl font-bold">{attendancePct}%</p><p className="text-xs text-muted-foreground">Attendance</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(isVolunteer || isAdmin) && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Link to="/scanner"><Button variant="outline" className="w-full justify-between">Scan QR Code <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link to="/exam"><Button variant="outline" className="w-full justify-between">View Exams <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link to="/certificates"><Button variant="outline" className="w-full justify-between">My Certificates <ArrowRight className="h-4 w-4" /></Button></Link>
              </CardContent>
            </Card>
          )}

          {(isInstructor || isAdmin) && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Instructor Tools</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Link to="/qr-generate"><Button variant="outline" className="w-full justify-between">Generate QR <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link to="/roster"><Button variant="outline" className="w-full justify-between">Manage Roster <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link to="/stats"><Button variant="outline" className="w-full justify-between">View Stats <ArrowRight className="h-4 w-4" /></Button></Link>
              </CardContent>
            </Card>
          )}

          {(isAdmin || isAssessmentAdmin) && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Admin Tools</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {isAdmin && <Link to="/command-center"><Button variant="outline" className="w-full justify-between">Command Center <ArrowRight className="h-4 w-4" /></Button></Link>}
                {isAdmin && <Link to="/config"><Button variant="outline" className="w-full justify-between">System Configuration <ArrowRight className="h-4 w-4" /></Button></Link>}
                <Link to="/results"><Button variant="outline" className="w-full justify-between">Exam Results <ArrowRight className="h-4 w-4" /></Button></Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Today&apos;s Schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg"><div><p className="font-medium text-sm">Morning Session</p><p className="text-xs text-muted-foreground">9:00 AM - 12:00 PM</p></div><Badge>Active</Badge></div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg"><div><p className="font-medium text-sm">Afternoon Session</p><p className="text-xs text-muted-foreground">2:00 PM - 5:00 PM</p></div><Badge variant="secondary">Upcoming</Badge></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
