import { GraduationCap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function ResultsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Exam Results</h1>
          <p className="text-muted-foreground">View volunteer exam results</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-orange-500" />
              Exam Results
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
