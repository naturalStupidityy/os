import { useState, useEffect } from "react"
import { Award, Download, Loader2, CalendarDays, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { certificateApi } from "@/lib/api"

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadCertificates()
  }, [])

  const loadCertificates = async () => {
    setIsLoading(true)
    try {
      const data = await certificateApi.getMyCertificates()
      setCertificates(data)
    } catch (e: any) {
      setError("Failed to load certificates")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (certId: string) => {
    try {
      const result = await certificateApi.downloadCertificate(certId)
      if (result.certificate) {
        // Create a JSON download for demo
        const blob = new Blob([JSON.stringify(result.certificate, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${result.certificate.certificateNumber}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      alert("Download failed: " + e.message)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="text-muted-foreground">Loading certificates...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Certificates</h1>
          <p className="text-muted-foreground">View and download your certificates</p>
        </div>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Certificate Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-orange-500/10 rounded-lg"><Award className="h-5 w-5 text-orange-500" /></div>
              <div><p className="text-2xl font-bold">{certificates.length}</p><p className="text-xs text-muted-foreground">Total Certificates</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div><p className="text-2xl font-bold">{certificates.filter(c => c.status === 'issued').length}</p><p className="text-xs text-muted-foreground">Issued</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg"><FileText className="h-5 w-5 text-blue-500" /></div>
              <div><p className="text-2xl font-bold">{certificates.filter(c => c.type === 'Completion').length}</p><p className="text-xs text-muted-foreground">Completion</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Certificates List */}
        <div className="grid gap-4">
          {certificates.map((cert) => (
            <Card key={cert.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Award className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{cert.type || 'Certificate'}</CardTitle>
                      <CardDescription>{cert.certificateNumber}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={cert.status === 'issued' ? 'success' : 'secondary'}>{cert.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Event</p>
                    <p className="font-medium">{cert.eventName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Score</p>
                    <p className="font-medium">{cert.score}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Grade</p>
                    <p className="font-medium">{cert.grade}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Issue Date</p>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      <span>{cert.issueDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Valid until: {cert.validUntil}</span>
                  <Button size="sm" onClick={() => handleDownload(cert.id)} variant="outline">
                    <Download className="h-4 w-4 mr-2" />Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {certificates.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No certificates found.</p>
                <p className="text-sm text-muted-foreground mt-1">Complete exams to earn certificates.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
