import { useState, useEffect } from "react"
import { QrCode, RefreshCw, Clock, CheckCircle2, Loader2, Copy, CalendarDays, MapPin, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { sessionApi, qrApi } from "@/lib/api"
import { QRCodeSVG } from "qrcode.react"

export default function QRGeneratePage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrResult, setQrResult] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (!qrResult || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [qrResult, timeLeft])

  const loadSessions = async () => {
    try {
      const data = await sessionApi.getSessions()
      setSessions(data)
      if (data.length > 0) setSelectedSessionId(data[0].id)
    } catch (e: any) {
      setError("Failed to load sessions")
    }
  }

  const handleGenerate = async () => {
    if (!selectedSessionId) return
    setIsGenerating(true)
    setError("")
    try {
      const result = await qrApi.generate(selectedSessionId)
      setQrResult(result)
      setTimeLeft(result.expiresIn || 900)
    } catch (e: any) {
      setError(e.message || "Failed to generate QR code")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (qrResult?.qrData) navigator.clipboard?.writeText(qrResult.qrData)
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  const selectedSession = sessions.find(s => s.id === selectedSessionId)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Generate QR</h1>
          <p className="text-muted-foreground">Generate QR codes for session attendance</p>
        </div>

        {/* Session Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" />
              Select Session
            </CardTitle>
            <CardDescription>Choose a training session to generate a QR code for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a session..." />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name} ({session.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedSession && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedSession.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedSession.timeStart} - {selectedSession.timeEnd}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedSession.venue}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedSession.enrolled}/{selectedSession.capacity}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!selectedSessionId || isGenerating}
              className="w-full bg-orange-500 hover:bg-orange-500/90"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
              {isGenerating ? "Generating..." : "Generate QR Code"}
            </Button>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>

        {/* QR Code Display */}
        {qrResult && (
          <Card className="border-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                QR Code Generated
              </CardTitle>
              <CardDescription>
                Session: {qrResult.sessionName || selectedSession?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                <div className="p-6 bg-white rounded-xl shadow-lg">
                  <QRCodeSVG
                    value={qrResult.qrData}
                    size={240}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className={timeLeft < 60 ? "text-red-500 font-semibold" : ""}>
                      Expires in: {fmt(timeLeft)}
                    </span>
                  </div>
                  <Badge variant={timeLeft > 0 ? "success" : "destructive"}>
                    {timeLeft > 0 ? "Active" : "Expired"}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />Copy Data
                </Button>
                <Button variant="outline" onClick={handleGenerate} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />Regenerate
                </Button>
              </div>

              {/* QR Data */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">QR Payload Data:</p>
                <code className="text-xs break-all font-mono">{qrResult.qrData}</code>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Select a training session from the dropdown</p>
            <p>2. Click Generate QR Code to create a new QR code</p>
            <p>3. The QR code is valid for 15 minutes</p>
            <p>4. Volunteers can scan this code to mark their attendance</p>
            <p>5. Click Regenerate to create a new code before the current one expires</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
