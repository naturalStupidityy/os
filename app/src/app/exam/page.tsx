import { useEffect } from "react"
import { Link } from "react-router-dom"
import { BookOpen, Clock, Award, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useExamStore } from "@/stores/examStore"
import { useAuthStore } from "@/stores/authStore"

export default function ExamPage() {
  const { exams, fetchExams } = useExamStore()
  const { user } = useAuthStore()
  const canTakeExam = user?.role === "volunteer" || user?.role === "assessment_admin" || user?.role === "admin"

  useEffect(() => { fetchExams() }, [fetchExams])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Exams & Assessments</h1><p className="text-muted-foreground">View and take your assessments</p></div>

        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-orange-500" />{exam.name}</CardTitle>
                  <Badge variant={exam.type === "pre_test" ? "secondary" : "default"}>{exam.type === "pre_test" ? "Pre-Test" : "Post-Test"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{exam.durationMinutes} min</span>
                  <span className="flex items-center gap-1"><Award className="h-4 w-4" />{exam.passingScore}% to pass</span>
                  <span>{exam.questionCount} questions</span>
                </div>
                <p className="text-sm text-muted-foreground">{exam.instructions}</p>
                {canTakeExam && (
                  <Link to={`/exam/${exam.id}`}>
                    <Button className="w-full bg-orange-500 hover:bg-orange-500/90">Start Exam <ArrowRight className="h-4 w-4 ml-2" /></Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}

          {exams.length === 0 && (
            <Card className="col-span-2"><CardContent className="p-8 text-center text-muted-foreground">No exams available at this time.</CardContent></Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
