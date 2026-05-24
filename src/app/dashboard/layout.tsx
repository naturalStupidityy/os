import { useAuthGuard } from "@/lib/auth"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useAuthGuard()

  return <DashboardLayout>{children}</DashboardLayout>
}
