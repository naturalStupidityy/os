import { useState, useEffect } from "react"
import { Activity, Loader2, AlertCircle, CheckCircle2, Clock, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { adminApi } from "@/lib/api"

export default function ApiStatusPage() {
  const [services, setServices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setIsLoading(true)
    try {
      const data = await adminApi.getAPIStatus()
      setServices(data)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError("Failed to load API status")
    } finally {
      setIsLoading(false)
    }
  }

  const operationalCount = services.filter(s => s.status === 'operational').length
  const degradedCount = services.filter(s => s.status === 'degraded').length
  const downCount = services.filter(s => s.status === 'down').length

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'degraded': return <WifiOff className="h-5 w-5 text-yellow-500" />
      case 'down': return <WifiOff className="h-5 w-5 text-red-500" />
      default: return <Activity className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational': return <Badge variant="success" className="capitalize">{status}</Badge>
      case 'degraded': return <Badge variant="warning" className="capitalize">{status}</Badge>
      case 'down': return <Badge variant="destructive" className="capitalize">{status}</Badge>
      default: return <Badge variant="outline" className="capitalize">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
          <p className="text-muted-foreground">Checking API status...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API Status</h1>
            <p className="text-muted-foreground">Monitor system API health status</p>
          </div>
          <Button variant="outline" onClick={loadStatus} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
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

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg"><Wifi className="h-5 w-5 text-green-500" /></div>
                <div><p className="text-2xl font-bold">{operationalCount}</p><p className="text-xs text-muted-foreground">Operational</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/10 rounded-lg"><WifiOff className="h-5 w-5 text-yellow-500" /></div>
                <div><p className="text-2xl font-bold">{degradedCount}</p><p className="text-xs text-muted-foreground">Degraded</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-lg"><WifiOff className="h-5 w-5 text-red-500" /></div>
                <div><p className="text-2xl font-bold">{downCount}</p><p className="text-xs text-muted-foreground">Down</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg"><Clock className="h-5 w-5 text-blue-500" /></div>
                <div><p className="text-sm font-medium">{lastUpdated.toLocaleTimeString()}</p><p className="text-xs text-muted-foreground">Last checked</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Health */}
        <Card className={downCount === 0 ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {downCount === 0 ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <AlertCircle className="h-6 w-6 text-red-600" />}
              <div>
                <p className="font-semibold">{downCount === 0 ? 'All Systems Operational' : `${downCount} Service(s) Down`}</p>
                <p className="text-sm text-muted-foreground">
                  {operationalCount} of {services.length} services running normally
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Detail */}
        <div className="grid gap-4">
          {services.map((service) => (
            <Card key={service.name} className={service.status !== 'operational' ? 'border-yellow-500' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">Uptime: {service.uptime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {service.latency}
                    </div>
                    {getStatusBadge(service.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
