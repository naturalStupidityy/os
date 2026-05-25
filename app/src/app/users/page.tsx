import { useState, useEffect } from "react"
import { Users, Loader2, AlertCircle, Search, RefreshCw, Shield, UserCircle, GraduationCap, ClipboardCheck, HelpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { adminApi } from "@/lib/api"

export default function UsersPage() {
  const [data, setData] = useState<any>({ users: [], total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const result = await adminApi.getUsers()
      setData(result)
    } catch (e: any) {
      setError("Failed to load users: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const filteredUsers = (data.users || []).filter((u: any) => {
    const matchesSearch = !searchQuery ||
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.vid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.mobileNumber?.includes(searchQuery)
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const roleLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    admin: { label: "System Admin", color: "bg-red-500/10 text-red-600", icon: <Shield className="h-3 w-3" /> },
    instructor: { label: "Instructor", color: "bg-amber-500/10 text-amber-600", icon: <GraduationCap className="h-3 w-3" /> },
    assessment_admin: { label: "Assessment Admin", color: "bg-purple-500/10 text-purple-600", icon: <ClipboardCheck className="h-3 w-3" /> },
    volunteer: { label: "Volunteer", color: "bg-blue-500/10 text-blue-600", icon: <UserCircle className="h-3 w-3" /> },
  }

  const getRoleBadge = (role: string) => {
    const config = roleLabels[role] || { label: role, color: "bg-gray-500/10 text-gray-600", icon: null }
    return (
      <Badge variant="outline" className={`${config.color} capitalize`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </Badge>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">View and manage all registered users in the system</p>
        </div>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" /> About User Management
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>System Admin:</strong> Full system control - configuration, user management, reports.</li>
              <li><strong>Instructor:</strong> Can generate QR codes, manage rosters, and view statistics.</li>
              <li><strong>Assessment Admin:</strong> Manages exams, views results, and issues certificates.</li>
              <li><strong>Volunteer:</strong> Attends sessions, takes exams, and earns certificates.</li>
              <li>Use the search box to find users by name, Volunteer ID (VID), or phone number.</li>
            </ul>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg"><Users className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-2xl font-bold">{data.total}</p><p className="text-xs text-muted-foreground">Total Users</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg"><UserCircle className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-2xl font-bold">{data.users?.filter((u: any) => u.role === "volunteer").length || 0}</p><p className="text-xs text-muted-foreground">Volunteers</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 rounded-lg"><GraduationCap className="h-5 w-5 text-amber-500" /></div>
            <div><p className="text-2xl font-bold">{data.users?.filter((u: any) => u.role === "instructor").length || 0}</p><p className="text-xs text-muted-foreground">Instructors</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-lg"><Shield className="h-5 w-5 text-red-500" /></div>
            <div><p className="text-2xl font-bold">{data.users?.filter((u: any) => u.role === "admin").length || 0}</p><p className="text-xs text-muted-foreground">Admins</p></div>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, VID, or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="admin">System Admin</SelectItem>
              <SelectItem value="assessment_admin">Assessment Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchUsers}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                User Directory
                <span className="text-sm font-normal text-muted-foreground">({filteredUsers.length} users)</span>
              </CardTitle>
              <CardDescription>Click on a user to view full details and manage their role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Volunteer ID</th>
                      <th className="text-left py-2 px-3 font-medium">Full Name</th>
                      <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Phone</th>
                      <th className="text-left py-2 px-3 font-medium">Role</th>
                      <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Unit</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u: any) => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3 font-mono text-xs">{u.vid}</td>
                        <td className="py-2 px-3 font-medium">{u.fullName || u.name || "—"}</td>
                        <td className="py-2 px-3 hidden md:table-cell">{u.mobileNumber || u.phone || "—"}</td>
                        <td className="py-2 px-3">{getRoleBadge(u.role)}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-muted-foreground">{u.unit || "—"}</td>
                        <td className="py-2 px-3">
                          <Badge variant={u.isActive ? "success" : "secondary"} className="capitalize">
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
