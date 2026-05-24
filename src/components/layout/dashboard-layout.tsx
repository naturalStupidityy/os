import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, CalendarDays, QrCode, ClipboardList, BarChart3,
  Shield, Users, Activity, FileText, Award, ScanLine, BookOpen,
  GraduationCap, Menu, X, LogOut, ChevronRight, Wifi, WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/stores/authStore"
import { getInitials } from "@/lib/utils"
import type { UserRole } from "@/types"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, roles: ["volunteer", "instructor", "admin", "assessment_admin"] },
  { label: "Sessions", href: "/sessions", icon: <CalendarDays className="h-5 w-5" />, roles: ["volunteer", "instructor", "admin"] },
  { label: "QR Scanner", href: "/scanner", icon: <ScanLine className="h-5 w-5" />, roles: ["volunteer", "admin"] },
  { label: "Exams", href: "/exam", icon: <BookOpen className="h-5 w-5" />, roles: ["volunteer", "assessment_admin", "admin"] },
  { label: "Certificates", href: "/certificates", icon: <Award className="h-5 w-5" />, roles: ["volunteer", "assessment_admin", "admin"] },
  { label: "Generate QR", href: "/qr-generate", icon: <QrCode className="h-5 w-5" />, roles: ["instructor", "admin"] },
  { label: "Roster", href: "/roster", icon: <ClipboardList className="h-5 w-5" />, roles: ["instructor", "admin"] },
  { label: "Stats", href: "/stats", icon: <BarChart3 className="h-5 w-5" />, roles: ["instructor", "admin"] },
  { label: "Command Center", href: "/command-center", icon: <Shield className="h-5 w-5" />, roles: ["admin"] },
  { label: "Configuration", href: "/config", icon: <Shield className="h-5 w-5" />, roles: ["admin"] },
  { label: "Users", href: "/users", icon: <Users className="h-5 w-5" />, roles: ["admin"] },
  { label: "API Status", href: "/api-status", icon: <Activity className="h-5 w-5" />, roles: ["admin"] },
  { label: "Results", href: "/results", icon: <GraduationCap className="h-5 w-5" />, roles: ["assessment_admin", "admin"] },
  { label: "Reports", href: "/reports", icon: <FileText className="h-5 w-5" />, roles: ["admin", "assessment_admin"] },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const logout = useAuthStore((s) => s.logout)

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  )

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VK</span>
            </div>
            <span className="font-semibold text-lg">VKumbh</span>
          </Link>
        </div>
        <Wifi className="h-4 w-4 text-green-500" />
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow">
              <span className="text-white font-bold">VK</span>
            </div>
            <div>
              <h1 className="font-bold text-xl">VKumbh</h1>
              <p className="text-xs text-muted-foreground">Volunteer System</p>
            </div>
          </Link>
        </div>

        {user && (
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="bg-orange-500/10 text-orange-500">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 py-2">
          <nav className="px-3 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-orange-500/10 text-orange-500" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        <Separator />

        <div className="p-3">
          <div className="flex items-center gap-2 px-3 py-2">
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-xs text-green-600">Online</span>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
