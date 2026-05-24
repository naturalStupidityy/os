import { useState, useRef, useEffect } from "react"
import { ScanLine, Camera, Keyboard, CheckCircle2, Loader2, AlertCircle, Zap, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { qrApi, attendanceApi } from "@/lib/api"

export default function ScannerPage() {
  const [scanMode, setScanMode] = useState<"camera" | "manual">("manual")
  const [qrData, setQrData] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [validation, setValidation] = useState<any>(null)
  const [checkInResult, setCheckInResult] = useState<any>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [error, setError] = useState("")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Camera setup
  useEffect(() => {
    if (scanMode === "camera") {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          setStream(s)
          if (videoRef.current) videoRef.current.srcObject = s
        })
        .catch(() => {
          setError("Camera access denied. Please use manual entry.")
          setScanMode("manual")
        })
    }
    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [scanMode])

  const handleValidate = async () => {
    if (!qrData.trim()) return
    setIsValidating(true)
    setError("")
    setValidation(null)
    setCheckInResult(null)
    try {
      const result = await qrApi.validate(qrData.trim())
      setValidation(result)
    } catch (e: any) {
      setError(e.message || "Failed to validate QR code")
    } finally {
      setIsValidating(false)
    }
  }

  const handleCheckIn = async () => {
    if (!validation?.sessionId) return
    setIsCheckingIn(true)
    try {
      const result = await attendanceApi.checkIn({
        sessionId: validation.sessionId,
        eventId: 'event-001',
        qrData: qrData.trim(),
        method: 'qr',
      })
      setCheckInResult(result)
    } catch (e: any) {
      setError(e.message || "Check-in failed")
    } finally {
      setIsCheckingIn(false)
    }
  }

  const reset = () => {
    setQrData("")
    setValidation(null)
    setCheckInResult(null)
    setError("")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">QR Scanner</h1>
          <p className="text-muted-foreground">Scan QR codes for attendance marking</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={scanMode === "camera" ? "default" : "outline"}
            onClick={() => { setScanMode("camera"); reset() }}
            className={scanMode === "camera" ? "bg-orange-500 hover:bg-orange-500/90" : ""}
          >
            <Camera className="h-4 w-4 mr-2" />Camera
          </Button>
          <Button
            variant={scanMode === "manual" ? "default" : "outline"}
            onClick={() => { setScanMode("manual"); reset() }}
            className={scanMode === "manual" ? "bg-orange-500 hover:bg-orange-500/90" : ""}
          >
            <Keyboard className="h-4 w-4 mr-2" />Manual Entry
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

        {/* Camera Mode */}
        {scanMode === "camera" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-orange-500" />
                Camera Scanner
              </CardTitle>
              <CardDescription>Point your camera at a QR code to scan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-orange-500/30 m-8 rounded-lg">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Or paste QR data here..."
                  value={qrData}
                  onChange={(e) => setQrData(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                />
                <Button onClick={handleValidate} disabled={!qrData.trim() || isValidating} className="bg-orange-500 hover:bg-orange-500/90">
                  {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Mode */}
        {scanMode === "manual" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-orange-500" />
                Manual QR Entry
              </CardTitle>
              <CardDescription>Type or paste the QR code data manually</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter QR code data..."
                  value={qrData}
                  onChange={(e) => setQrData(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                  className="flex-1"
                />
                <Button onClick={handleValidate} disabled={!qrData.trim() || isValidating} className="bg-orange-500 hover:bg-orange-500/90">
                  {isValidating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Validate
                </Button>
              </div>
              {qrData && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="font-mono text-xs break-all max-w-full">
                    {qrData.length > 60 ? qrData.slice(0, 60) + '...' : qrData}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setQrData("")}><X className="h-3 w-3" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Validation Result */}
        {validation && !checkInResult && (
          <Card className={validation.valid ? "border-green-500" : "border-red-500"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {validation.valid ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
                {validation.valid ? "Valid QR Code" : "Invalid QR Code"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validation.sessionName && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Session:</span> <span className="font-medium">{validation.sessionName}</span></div>
                  <div><span className="text-muted-foreground">Session ID:</span> <span className="font-mono">{validation.sessionId}</span></div>
                  {validation.instructorId && <div><span className="text-muted-foreground">Instructor:</span> <span className="font-medium">{validation.instructorId}</span></div>}
                  {validation.expired !== undefined && <div><span className="text-muted-foreground">Status:</span> <Badge variant={validation.expired ? "destructive" : "success"}>{validation.expired ? "Expired" : "Active"}</Badge></div>}
                </div>
              )}
              {validation.valid && (
                <Button onClick={handleCheckIn} disabled={isCheckingIn} className="w-full bg-green-600 hover:bg-green-600/90">
                  {isCheckingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Mark Attendance
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Check-in Result */}
        {checkInResult && (
          <Card className="border-green-500 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Attendance Marked Successfully
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Record ID:</span> <span className="font-mono">{checkInResult.record?.id?.slice(0, 8)}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="success">{checkInResult.record?.status}</Badge></div>
                <div><span className="text-muted-foreground">Time:</span> <span>{new Date(checkInResult.record?.checkInAt).toLocaleTimeString()}</span></div>
                <div><span className="text-muted-foreground">Method:</span> <Badge variant="outline">{checkInResult.record?.checkInMethod || 'qr'}</Badge></div>
              </div>
              <p className="text-sm text-green-700">{checkInResult.message}</p>
              <Button variant="outline" onClick={reset} className="w-full">Scan Another</Button>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Select Camera mode to scan a QR code with your device camera</p>
            <p>2. Or select Manual Entry and paste the QR code data</p>
            <p>3. Click Validate to verify the QR code</p>
            <p>4. If valid, click Mark Attendance to record your check-in</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
