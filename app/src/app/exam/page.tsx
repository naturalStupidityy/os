import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BookOpen, Clock, Award, ArrowRight, Eye, Loader2, HelpCircle, CheckCircle2, Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useExamStore } from "@/stores/examStore"
import { useAuthStore } from "@/stores/authStore"
import { examApi } from "@/lib/api"

export default function ExamPage() {
  const { exams, fetchExams } = useExamStore()
  const { user } = useAuthStore()
  const [examStatus, setExamStatus] = useState<any>(null)
  const canTakeExam = user?.role === "volunteer" || user?.role === "assessment_admin" || user?.role === "admin"

  useEffect(() => { fetchExams() }, [fetchExams])

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await examApi.getMyStatus()
        setExamStatus(status)
      } catch {
        // Silently fail
      }
    }
    loadStatus()
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Exams &amp; Assessments</h1>
          <p className="text-muted-foreground">View and take your assessments</p>
        </div>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" /> How Exams Work
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>Pre-Test:</strong> A diagnostic assessment with 15 questions (30 min). Tests your baseline knowledge.</li>
              <li><strong>Post-Test:</strong> A comprehensive assessment with 30 questions (60 min). Tests all training modules.</li>
              <li><strong>Requirements:</strong> You need 75% attendance to take exams. You must complete the Pre-Test before the Post-Test.</li>
              <li><strong>Passing Score:</strong> 50% required to pass. Post-Test allows 2 attempts.</li>
              <li><strong>Preview Mode:</strong> Click the eye icon to view the full question paper with answers for study purposes.</li>
            </ul>
          </CardContent>
        </Card>

        {/* My Status */}
        {examStatus && (
          <Card className={examStatus.canTakePreTest ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                {examStatus.canTakePreTest ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-yellow-600" />}
                My Exam Status
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Attendance</p><p className="font-medium">{examStatus.attendancePercentage}%</p></div>
                <div><p className="text-muted-foreground text-xs">Sessions Attended</p><p className="font-medium">{examStatus.sessionsAttended}/{examStatus.totalSessions}</p></div>
                <div><p className="text-muted-foreground text-xs">Pre-Test</p><p className="font-medium">{examStatus.preTestTaken ? (examStatus.preTestPassed ? "Passed" : "Taken") : "Not Taken"}</p></div>
                <div><p className="text-muted-foreground text-xs">Post-Test</p><p className="font-medium">{examStatus.postTestTaken ? (examStatus.postTestPassed ? "Passed" : "Taken") : "Not Taken"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exams List */}
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => {
            const isPreTest = exam.type === "pre_test"
            const hasTaken = isPreTest ? examStatus?.preTestTaken : examStatus?.postTestTaken
            const hasPassed = isPreTest ? examStatus?.preTestPassed : examStatus?.postTestPassed

            return (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-orange-500" />
                      {exam.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      {hasPassed && <Badge variant="success">Passed</Badge>}
                      {hasTaken && !hasPassed && <Badge variant="warning">Attempted</Badge>}
                      <Badge variant={isPreTest ? "secondary" : "default"}>{isPreTest ? "Pre-Test" : "Post-Test"}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{exam.durationMinutes} min</span>
                    <span className="flex items-center gap-1"><Award className="h-4 w-4" />{exam.passingScore}% to pass</span>
                    <span>{exam.questionCount} questions</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{exam.instructions}</p>
                  <div className="flex gap-2">
                    {canTakeExam && (
                      <Link to={`/exam/${exam.id}`} className="flex-1">
                        <Button className="w-full bg-orange-500 hover:bg-orange-500/90">
                          {hasPassed ? "Retake Exam" : hasTaken ? "Retry Exam" : "Start Exam"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                    <Link to={`/preview/${exam.id}`}>
                      <Button variant="outline" title="Preview question paper">
                        <Eye className="h-4 w-4 mr-1" /> Preview
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {exams.length === 0 && (
            <Card className="col-span-2">
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading exams...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
