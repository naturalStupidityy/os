import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, ArrowRight, Loader2, Shield, GraduationCap, UserCircle, ClipboardCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/stores/authStore"
import type { UserRole } from "@/types"

const ROLES: { value: UserRole; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { value: "volunteer", label: "Volunteer", description: "Attend sessions, take exams, earn certificates", icon: <UserCircle className="h-5 w-5" />, color: "bg-blue-500/10 text-blue-600" },
  { value: "instructor", label: "Instructor", description: "Generate QR codes, manage rosters, view stats", icon: <GraduationCap className="h-5 w-5" />, color: "bg-amber-500/10 text-amber-600" },
  { value: "assessment_admin", label: "Assessment Admin", description: "Manage exams, view results, issue certificates", icon: <ClipboardCheck className="h-5 w-5" />, color: "bg-purple-500/10 text-purple-600" },
  { value: "admin", label: "System Admin", description: "Full system control, configuration, reports", icon: <Shield className="h-5 w-5" />, color: "bg-red-500/10 text-red-600" },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { requestOTP, verifyOTP, demoLogin } = useAuthStore()
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"role" | "phone" | "otp">("role")
  const [otp, setOtp] = useState("")
  const [selectedRole, setSelectedRole] = useState<UserRole>("volunteer")

  const handleQuickLogin = async (role: UserRole) => {
    setIsLoading(true)
    try {
      await demoLogin(role)
      const { user } = useAuthStore.getState()
      if (user) {
        const routes: Record<UserRole, string> = { admin: "/command-center", instructor: "/dashboard", assessment_admin: "/dashboard", volunteer: "/dashboard" }
        navigate(routes[user.role])
      }
    } catch (e) {
      alert("Login failed: " + (e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length < 10) return
    setIsLoading(true)
    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`
      await requestOTP(formattedPhone, selectedRole)
      setStep("otp")
    } catch {
      alert("Failed to send OTP")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp) return
    setIsLoading(true)
    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`
      await verifyOTP(formattedPhone, otp, selectedRole)
      const { user } = useAuthStore.getState()
      if (user) {
        const routes: Record<UserRole, string> = { admin: "/command-center", instructor: "/dashboard", assessment_admin: "/dashboard", volunteer: "/dashboard" }
        navigate(routes[user.role])
      }
    } catch {
      alert("Invalid OTP")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-background to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-bold">VK</span>
          </div>
          <h1 className="text-3xl font-bold">VKumbh</h1>
          <p className="text-muted-foreground mt-1">Volunteer Management System</p>
          {step !== "role" && (
            <Badge variant="outline" className={cn("mt-2 cursor-pointer", ROLES.find(r => r.value === selectedRole)?.color)} onClick={() => setStep("role")}>
              {selectedRole.replace("_", " ")} - Click to change
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {step === "role" ? "Select Your Role" : step === "phone" ? "Enter Phone" : "Verify OTP"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === "role" ? (
              <div className="space-y-3">
                {ROLES.map((role) => (
                  <button key={role.value} onClick={() => { setSelectedRole(role.value); setStep("phone") }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:shadow-md transition-all text-left">
                    <div className={cn("p-2.5 rounded-lg", role.color)}>{role.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">Quick Login</span></div></div>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <Button key={role.value} variant="outline" size="sm" onClick={() => handleQuickLogin(role.value)} disabled={isLoading} className={cn("text-xs", role.color)}>
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : role.icon}
                      <span className="ml-1">{role.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : step === "phone" ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input type="tel" placeholder="Phone number" className="pl-10 h-12" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                </div>
                <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-500/90" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Continue"}
                  {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("role")}>Back</Button>
              </form>
            ) : (
              <form onSubmit={handleOTPSubmit} className="space-y-4">
                <Input type="text" placeholder="Enter OTP" className="h-12 text-center text-2xl tracking-[0.5em]" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-500/90" disabled={isLoading}>{isLoading ? "Verifying..." : "Verify OTP"}</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("phone")}>Change Number</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
