import { CalendarDays } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function SessionsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">View all training sessions and schedules</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" />
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This page is under development. Full functionality coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
