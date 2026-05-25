import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Clock, ArrowLeft, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Loader2, Award, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { examApi } from "@/lib/api"

interface Question {
  id: string;
  question: string;
  options: Record<string, string>;
  orderIndex: number;
}

interface ExamState {
  id: string;
  examId: string;
  startedAt: string;
  durationMinutes: number;
  questions: Question[];
}

export default function ExamDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const examId = params.examId as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [examState, setExamState] = useState<ExamState | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => { loadExam() }, [examId])

  useEffect(() => {
    if (!examState || isFinished || timeRemaining <= 0) return
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [examState, isFinished, timeRemaining])

  const loadExam = async () => {
    setIsLoading(true)
    try {
      await examApi.getExam(examId)
      const attempt = await examApi.startExam(examId)
      setExamState({
        id: attempt.id,
        examId: attempt.examId || examId,
        startedAt: attempt.startedAt || new Date().toISOString(),
        durationMinutes: attempt.durationMinutes || 60,
        questions: attempt.questions || [],
      })
      setTimeRemaining((attempt.durationMinutes || 60) * 60)
    } catch {
      alert("Failed to load exam")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswer = (qid: string, opt: string) => setAnswers((p) => ({ ...p, [qid]: opt }))

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || isFinished) return
    setIsSubmitting(true)
    try {
      const res = await examApi.submitExam(examId, answers)
      setResult(res)
      setIsFinished(true)
    } catch {
      alert("Submit failed")
    } finally {
      setIsSubmitting(false)
    }
  }, [examId, answers, isSubmitting, isFinished])

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  if (isLoading) {
    return <DashboardLayout><div className="flex flex-col items-center justify-center min-h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" /><p>Starting exam...</p></div></DashboardLayout>
  }

  if (isFinished && result) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate("/exam")}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          <Card className={result.isPassed ? "border-green-500" : "border-red-500"}>
            <CardContent className="p-8 text-center">
              {result.isPassed ? <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" /> : <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />}
              <h1 className="text-3xl font-bold mb-2">{result.isPassed ? "Congratulations!" : "Keep Trying"}</h1>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card><CardContent className="p-4"><p className="text-2xl font-bold">{result.score}/{result.totalQuestions}</p><p className="text-xs text-muted-foreground">Score</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className={`text-2xl font-bold ${result.isPassed ? "text-green-600" : "text-red-600"}`}>{result.percentage}%</p><p className="text-xs text-muted-foreground">Percentage</p></CardContent></Card>
                <Card><CardContent className="p-4"><Badge variant={result.isPassed ? "success" : "destructive"}>{result.isPassed ? "PASSED" : "FAILED"}</Badge></CardContent></Card>
              </div>
              <Progress value={result.percentage} className="h-3 mb-6" />
              <div className="flex gap-3 justify-center">
                <Link to="/certificates"><Button variant="outline"><Award className="h-4 w-4 mr-2" />Certificates</Button></Link>
                <Button onClick={() => navigate("/exam")} className="bg-orange-500 hover:bg-orange-500/90"><BookOpen className="h-4 w-4 mr-2" />Exams</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!examState || examState.questions.length === 0) {
    return <DashboardLayout><div className="max-w-2xl mx-auto text-center"><AlertCircle className="h-12 w-12 mx-auto mb-4" /><h2 className="text-xl font-semibold">No Exam Data</h2><Button className="mt-4" onClick={() => navigate("/exam")}>Go Back</Button></div></DashboardLayout>
  }

  const q = examState.questions[currentIdx]
  const answered = Object.keys(answers).length
  const total = examState.questions.length
  const pct = Math.round((answered / total) * 100)

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/exam")}><ArrowLeft className="h-4 w-4 mr-1" />Exit</Button>
          <div className="flex items-center gap-2"><Clock className={`h-4 w-4 ${timeRemaining < 300 ? "text-red-500" : ""}`} /><span className={`font-mono font-semibold ${timeRemaining < 300 ? "text-red-500" : ""}`}>{fmt(timeRemaining)}</span></div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm"><span>Question {currentIdx + 1} of {total}</span><span>{answered} answered</span></div>
          <Progress value={pct} className="h-2" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg"><span className="text-orange-500 mr-2">Q{currentIdx + 1}.</span>{q.question}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(q.options).map(([key, val]) => {
              const sel = answers[q.id] === key
              return (
                <button key={key} onClick={() => handleAnswer(q.id, key)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${sel ? "border-orange-500 bg-orange-50" : "border-muted hover:border-orange-300"}`}>
                  <div className="flex items-start gap-3">
                    <Badge variant={sel ? "default" : "outline"} className={sel ? "bg-orange-500" : ""}>{key.toUpperCase()}</Badge>
                    <span className="text-sm">{val}</span>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
          {currentIdx === total - 1 ? (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-500/90">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Exam"}</Button>
          ) : (
            <Button onClick={() => setCurrentIdx(currentIdx + 1)}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
