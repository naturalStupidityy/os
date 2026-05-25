import { useState, useEffect } from "react"
import { GraduationCap, Loader2, AlertCircle, Search, Award, TrendingUp, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { examApi } from "@/lib/api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

export default function ResultsPage() {
  const [attempts, setAttempts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [examFilter, setExamFilter] = useState("all")

  useEffect(() => {
    loadAttempts()
  }, [])

  const loadAttempts = async () => {
    setIsLoading(true)
    try {
      const data = await examApi.getAllAttempts()
      setAttempts(data)
    } catch (e: any) {
      setError("Failed to load exam results")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAttempts = attempts.filter((a) => {
    const matchesSearch = !searchQuery || a.userName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesExam = examFilter === 'all' || a.examId === examFilter
    return matchesSearch && matchesExam
  })

  const passedCount = filteredAttempts.filter(a => a.isPassed).length
  const failedCount = filteredAttempts.filter(a => !a.isPassed).length
  const avgScore = filteredAttempts.length > 0 ? Math.round(filteredAttempts.reduce((sum, a) => sum + a.percentage, 0) / filteredAttempts.length) : 0

  const scoreDistribution = [
    { range: '90-100%', count: filteredAttempts.filter(a => a.percentage >= 90).length },
    { range: '80-89%', count: filteredAttempts.filter(a => a.percentage >= 80 && a.percentage < 90).length },
    { range: '70-79%', count: filteredAttempts.filter(a => a.percentage >= 70 && a.percentage < 80).length },
    { range: '60-69%', count: filteredAttempts.filter(a => a.percentage >= 60 && a.percentage < 70).length },
    { range: 'Below 60%', count: filteredAttempts.filter(a => a.percentage < 60).length },
  ]

  const COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444']

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Exam Results</h1>
          <p className="text-muted-foreground">View volunteer exam results</p>
        </div>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg"><GraduationCap className="h-5 w-5 text-blue-500" /></div>
              <div><p className="text-2xl font-bold">{filteredAttempts.length}</p><p className="text-xs text-muted-foreground">Total Attempts</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div><p className="text-2xl font-bold">{passedCount}</p><p className="text-xs text-muted-foreground">Passed</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-lg"><XCircle className="h-5 w-5 text-red-500" /></div>
              <div><p className="text-2xl font-bold">{failedCount}</p><p className="text-xs text-muted-foreground">Failed</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg"><TrendingUp className="h-5 w-5 text-purple-500" /></div>
              <div><p className="text-2xl font-bold">{avgScore}%</p><p className="text-xs text-muted-foreground">Avg Score</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Score Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-500" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by volunteer name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter by exam" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              <SelectItem value="exam-001">Pre-Test</SelectItem>
              <SelectItem value="exam-002">Post-Test</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAttempts}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Volunteer</th>
                    <th className="text-left py-2 px-3 font-medium">Exam</th>
                    <th className="text-right py-2 px-3 font-medium">Score</th>
                    <th className="text-right py-2 px-3 font-medium">Percentage</th>
                    <th className="text-left py-2 px-3 font-medium">Result</th>
                    <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.map((a) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{a.userName}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline">{a.examId === 'exam-001' ? 'Pre-Test' : 'Post-Test'}</Badge>
                      </td>
                      <td className="py-2 px-3 text-right">{a.score}/{a.totalQuestions}</td>
                      <td className="py-2 px-3 text-right font-semibold">{a.percentage}%</td>
                      <td className="py-2 px-3">
                        <Badge variant={a.isPassed ? 'success' : 'destructive'}>
                          {a.isPassed ? 'PASSED' : 'FAILED'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground hidden md:table-cell">
                        {new Date(a.submittedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {filteredAttempts.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No results found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
