"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  QrCode,
  ClipboardList,
  BarChart3,
  Settings,
  Users,
  Shield,
  FileText,
  Award,
  ScanLine,
  BookOpen,
  GraduationCap,
  Activity,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Wifi,
  WifiOff,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/stores/authStore"
import { useSyncStore } from "@/stores/syncStore"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { useLogout } from "@/lib/auth"
import { getInitials } from "@/lib/utils"
import { UserRole } from "@/types"
import { Toaster } from "@/components/ui/toaster"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  // Shared
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, roles: ["volunteer", "instructor", "admin", "assessment_admin"] },

  // Volunteer + Instructor + Admin
  { label: "Sessions", href: "/sessions", icon: <CalendarDays className="h-5 w-5" />, roles: ["volunteer", "instructor", "admin"] },

  // Volunteer + Admin
  { label: "QR Scanner", href: "/scanner", icon: <ScanLine className="h-5 w-5" />, roles: ["volunteer", "admin"] },

  // Exam: Volunteer + Assessment Admin + Admin
  { label: "Exams", href: "/exam", icon: <BookOpen className="h-5 w-5" />, roles: ["volunteer", "assessment_admin", "admin"] },

  // Certificates: Volunteer + Assessment Admin + Admin
  { label: "Certificates", href: "/certificates", icon: <Award className="h-5 w-5" />, roles: ["volunteer", "assessment_admin", "admin"] },

  // Instructor + Admin
  { label: "Generate QR", href: "/qr-generate", icon: <QrCode className="h-5 w-5" />, roles: ["instructor", "admin"] },
  { label: "Roster", href: "/roster", icon: <ClipboardList className="h-5 w-5" />, roles: ["instructor", "admin"] },
  { label: "Stats", href: "/stats", icon: <BarChart3 className="h-5 w-5" />, roles: ["instructor", "admin"] },

  // Admin only
  { label: "Command Center", href: "/command-center", icon: <Shield className="h-5 w-5" />, roles: ["admin"] },
  { label: "Configuration", href: "/config", icon: <Settings className="h-5 w-5" />, roles: ["admin"] },
  { label: "Users", href: "/users", icon: <Users className="h-5 w-5" />, roles: ["admin"] },
  { label: "API Status", href: "/api-status", icon: <Activity className="h-5 w-5" />, roles: ["admin"] },

  // Assessment Admin + Admin
  { label: "Results", href: "/results", icon: <GraduationCap className="h-5 w-5" />, roles: ["assessment_admin", "admin"] },
  { label: "Reports", href: "/reports", icon: <FileText className="h-5 w-5" />, roles: ["admin", "assessment_admin"] },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { queue, isSyncing, syncAll } = useSyncStore()
  const isOnline = useOnlineStatus()
  const logout = useLogout()

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  )

  const pendingCount = queue.filter((q) => q.status === "pending").length

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-vkumbh-orange rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VK</span>
            </div>
            <span className="font-semibold text-lg">VKumbh</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          {pendingCount > 0 && (
            <Badge variant="warning" className="text-xs">{pendingCount}</Badge>
          )}
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-vkumbh-orange rounded-xl flex items-center justify-center shadow">
              <span className="text-white font-bold">VK</span>
            </div>
            <div>
              <h1 className="font-bold text-xl">VKumbh</h1>
              <p className="text-xs text-muted-foreground">Volunteer System</p>
            </div>
          </Link>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-vkumbh-orange/10 text-vkumbh-orange">
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

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="px-3 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-vkumbh-orange/10 text-vkumbh-orange"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant={isActive ? "default" : "secondary"} className="text-xs">{item.badge}</Badge>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Bottom Actions */}
        <div className="p-3 space-y-2">
          {pendingCount > 0 && (
            <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-700 dark:text-yellow-300">{pendingCount} items pending</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => syncAll()} disabled={isSyncing || !isOnline}>
                  <RotateCcw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2">
            {isOnline ? (
              <><Wifi className="h-4 w-4 text-green-500" /><span className="text-xs text-green-600 dark:text-green-400">Online</span></>
            ) : (
              <><WifiOff className="h-4 w-4 text-red-500" /><span className="text-xs text-red-600 dark:text-red-400">Offline Mode</span></>
            )}
          </div>

          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <Toaster />
    </div>
  )
}
