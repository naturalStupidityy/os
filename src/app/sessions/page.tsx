import { useState, useEffect } from "react"
import { CalendarDays, Clock, MapPin, Users, BookOpen, Loader2, AlertCircle, ChevronRight, CheckCircle2, PlayCircle, Circle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { sessionApi } from "@/lib/api"
import { Link } from "react-router-dom"

export default function SessionsPage() {
  const [schedule, setSchedule] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeDay, setActiveDay] = useState("")

  useEffect(() => {
    loadSchedule()
  }, [])

  const loadSchedule = async () => {
    setIsLoading(true)
    try {
      const data = await sessionApi.getDaywiseSchedule()
      setSchedule(data)
      if (data.length > 0) setActiveDay(String(data[0].day))
    } catch (e: any) {
      setError("Failed to load schedule")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'in_progress': return <PlayCircle className="h-4 w-4 text-blue-500" />
      default: return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completed</Badge>
      case 'in_progress': return <Badge className="bg-blue-500">In Progress</Badge>
      case 'scheduled': return <Badge variant="secondary">Scheduled</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="text-muted-foreground">Loading schedule...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">View all training sessions and schedules</p>
        </div>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeDay} onValueChange={setActiveDay}>
          <TabsList className="flex-wrap h-auto">
            {schedule.map((day) => (
              <TabsTrigger key={day.day} value={String(day.day)} className="text-xs">
                Day {day.day}
                <span className="ml-1 text-muted-foreground">({day.date})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {schedule.map((day) => (
            <TabsContent key={day.day} value={String(day.day)}>
              <div className="space-y-4">
                {/* Day Header */}
                <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-lg">Day {day.day}: {day.date}</h3>
                        <p className="text-sm text-muted-foreground">
                          {day.sessions.length} session{day.sessions.length !== 1 ? 's' : ''} scheduled
                        </p>
                      </div>
                      {day.hasExam && (
                        <Link to="/exam">
                          <Badge className="bg-orange-500 cursor-pointer hover:bg-orange-600">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {day.examType === 'pre_test' ? 'Pre-Test' : 'Post-Test'} Available
                          </Badge>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Sessions */}
                {day.sessions.length === 0 ? (
                  <Card className="text-center py-8">
                    <CardContent>
                      <CalendarDays className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">No sessions scheduled for this day.</p>
                    </CardContent>
                  </Card>
                ) : (
                  day.sessions.map((session: any) => (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(session.status)}
                            <div>
                              <CardTitle className="text-base">{session.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <span className="capitalize">{session.slot.replace('_', ' ')}</span>
                                <span>|</span>
                                <span>{getStatusBadge(session.status)}</span>
                              </CardDescription>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{session.timeStart} - {session.timeEnd}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{session.venue}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{session.enrolled}/{session.capacity} enrolled</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span>{session.date}</span>
                          </div>
                        </div>

                        {/* Attendance bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Attendance</span>
                            <span>{Math.round((session.attended / session.enrolled) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${Math.round((session.attended / session.enrolled) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
