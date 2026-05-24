import { QrCode } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function QrGeneratePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Generate QR</h1>
          <p className="text-muted-foreground">Generate QR codes for session attendance</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-orange-500" />
              Generate QR
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
