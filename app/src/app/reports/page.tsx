import { useState, useEffect } from "react"
import { FileText, Download, Loader2, AlertCircle, FileSpreadsheet, FileCheck, Clock, RefreshCw, FileBarChart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { adminApi } from "@/lib/api"

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const data = await adminApi.getReports()
      setReports(data)
    } catch (e: any) {
      setError("Failed to load reports")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async (reportId: string) => {
    setIsGenerating(reportId)
    try {
      await adminApi.generateReport(reportId)
      alert("Report generation started! Check back shortly.")
    } catch (e: any) {
      alert("Failed to generate report: " + e.message)
    } finally {
      setIsGenerating(null)
    }
  }

  const handleDownload = (report: any) => {
    // Create a demo download
    const reportData = {
      reportId: report.id,
      title: report.title,
      type: report.type,
      generatedAt: report.generatedAt,
      data: { message: 'This is a demo report. In production, this would contain actual report data.' },
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.id}-${report.type}-report.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'attendance': return <FileCheck className="h-5 w-5 text-green-500" />
      case 'eligibility': return <FileSpreadsheet className="h-5 w-5 text-blue-500" />
      case 'unit_wise': return <FileBarChart className="h-5 w-5 text-purple-500" />
      case 'certificate': return <FileCheck className="h-5 w-5 text-orange-500" />
      case 'exam': return <FileText className="h-5 w-5 text-red-500" />
      default: return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getFormatIcon = (format: string) => {
    return format === 'xlsx' ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Generate and view system reports</p>
          </div>
          <Button variant="outline" onClick={loadReports} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Report Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{reports.length}</p><p className="text-xs text-muted-foreground">Total Reports</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{reports.filter(r => r.status === 'ready').length}</p><p className="text-xs text-muted-foreground">Ready</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{reports.filter(r => r.format === 'pdf').length}</p><p className="text-xs text-muted-foreground">PDF</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{reports.filter(r => r.format === 'xlsx').length}</p><p className="text-xs text-muted-foreground">Excel</p></CardContent></Card>
        </div>

        {/* Reports List */}
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      {getReportIcon(report.type)}
                    </div>
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="capitalize">{report.type.replace('_', ' ')}</Badge>
                        <span className="flex items-center gap-1">
                          {getFormatIcon(report.format)}
                          {report.format?.toUpperCase()}
                        </span>
                        <span>{report.size}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(report.generatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerate(report.id)}
                      disabled={isGenerating === report.id}
                    >
                      {isGenerating === report.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Regenerate
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(report)}
                      className="bg-orange-500 hover:bg-orange-500/90"
                    >
                      <Download className="h-4 w-4 mr-2" />Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {reports.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reports available.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">About Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>All reports are generated from live system data.</p>
            <p>Click Download to save a report to your device.</p>
            <p>Click Regenerate to refresh a report with the latest data.</p>
            <p>PDF reports are formatted for printing and sharing.</p>
            <p>Excel reports contain raw data for further analysis.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
