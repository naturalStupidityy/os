import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { BookOpen, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Award, Clock, HelpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { examApi } from "@/lib/api"

interface QuestionView {
  id: string;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  category: string;
  orderIndex: number;
}

export default function ExamPreviewPage() {
  const params = useParams()
  const examId = params.examId as string

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [examData, setExamData] = useState<any>(null)
  const [questions, setQuestions] = useState<QuestionView[]>([])

  useEffect(() => {
    loadPreview()
  }, [examId])

  const loadPreview = async () => {
    setIsLoading(true)
    try {
      const data = await examApi.getPreview(examId)
      setExamData(data.exam)
      setQuestions(data.questions || [])
    } catch (e: any) {
      setError("Failed to load exam preview: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="text-muted-foreground">Loading exam preview...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Link to="/exam"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/exam"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />Back to Exams</Button></Link>
          <Badge variant="outline" className="text-xs"><HelpCircle className="h-3 w-3 mr-1" />Preview Mode</Badge>
        </div>

        {/* Exam Info */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{examData?.name || "Exam Preview"}</h1>
                <p className="text-sm text-muted-foreground mt-1">{examData?.instructions}</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{examData?.durationMinutes} min</Badge>
                  <Badge variant="secondary"><Award className="h-3 w-3 mr-1" />{examData?.passingScore}% to pass</Badge>
                  <Badge variant="secondary">{questions.length} questions</Badge>
                  <Badge variant="outline">{examData?.type === "pre_test" ? "Pre-Test" : "Post-Test"}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" /> About This Preview
            </h3>
            <p className="text-sm text-blue-700">
              This page shows the full question paper along with correct answers and explanations. This is for study and review purposes only. When you take the actual exam, questions will be presented one at a time without answer hints.
            </p>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card key={q.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-medium">
                    <span className="text-orange-500 mr-2">Q{idx + 1}.</span>
                    {q.question}
                  </CardTitle>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{q.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Options */}
                <div className="space-y-2">
                  {Object.entries(q.options).map(([key, val]) => {
                    const isCorrect = key === q.correctAnswer;
                    return (
                      <div
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                          isCorrect
                            ? "border-green-500 bg-green-50"
                            : "border-muted bg-muted/30"
                        }`}
                      >
                        <Badge
                          variant={isCorrect ? "success" : "outline"}
                          className={isCorrect ? "bg-green-500" : ""}
                        >
                          {key.toUpperCase()}
                        </Badge>
                        <span className="text-sm flex-1">{val}</span>
                        {isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
                    <p className="text-sm text-blue-700">{q.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 justify-center pb-8">
          <Link to="/exam">
            <Button variant="outline" size="lg"><ArrowLeft className="h-4 w-4 mr-2" />Back to Exams</Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
