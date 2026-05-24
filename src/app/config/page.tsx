import { useState, useEffect, useCallback } from "react"
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle2, Loader2, Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { adminApi } from "@/lib/api"

interface ConfigItem {
  key: string;
  value: string;
  defaultValue?: string;
  value_type: string;
  category: string;
  description: string;
  min_value?: number | null;
  max_value?: number | null;
  editable_by_admin: boolean;
  requires_restart: boolean;
  isDirty?: boolean;
}

const CATEGORIES: Record<string, { label: string; description: string }> = {
  attendance: { label: "Attendance Rules", description: "Thresholds, windows, override policies" },
  logistics: { label: "Tent & Logistics", description: "Tent count, capacity, gender sectors" },
  assessment: { label: "Assessment Rules", description: "Exam parameters, passing criteria, retries" },
  batch: { label: "Batch Settings", description: "Duration, session times, capacity" },
  certificate: { label: "Certificate Rules", description: "Issuance criteria" },
  security: { label: "Security Settings", description: "QR expiry, JWT, encryption" },
  notifications: { label: "Notifications", description: "SMS, WhatsApp, email settings" },
  general: { label: "General", description: "Registration and system-wide settings" },
}

export default function ConfigPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState("attendance")
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")

  const categories = Object.keys(CATEGORIES)

  const fetchConfigs = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await adminApi.getConfig()
      setConfigs(data.map((c: any) => ({ ...c, value: c.value ?? c.config_value ?? "", isDirty: false })))
    } catch {
      setConfigs([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfigs() }, [fetchConfigs])

  const updateLocalValue = (key: string, value: string) => {
    setConfigs((prev) => prev.map((item) => item.key === key ? { ...item, value, isDirty: true } : item))
    setPendingChanges((prev) => ({ ...prev, [key]: value }))
    setSaveStatus("idle")
  }

  const handleSaveSingle = async (key: string, value: string) => {
    setIsSaving(true)
    try {
      const result = await adminApi.updateConfig(key, value)
      if (result.success) {
        setConfigs((prev) => prev.map((item) => item.key === key ? { ...item, isDirty: false } : item))
        setPendingChanges((prev) => { const n = { ...prev }; delete n[key]; return n })
        setSaveStatus("saved")
      }
    } catch {
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkSave = async () => {
    setIsSaving(true)
    try {
      const updates = Object.entries(pendingChanges).map(([key, value]) => ({ key, value }))
      await adminApi.bulkUpdateConfig(updates)
      setPendingChanges({})
      setSaveStatus("saved")
      await fetchConfigs()
    } catch {
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
      setShowBulkConfirm(false)
    }
  }

  const handleReset = async () => {
    await fetchConfigs()
    setPendingChanges({})
    setSaveStatus("idle")
  }

  const renderInput = (item: ConfigItem) => {
    if (item.editable_by_admin === false) {
      return <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-muted-foreground" /><Badge variant="secondary">{String(item.value)}</Badge></div>
    }
    if (item.value_type === "boolean") {
      const isOn = item.value === "true" || item.value === "1"
      return <div className="flex items-center gap-3"><Badge variant={isOn ? "success" : "secondary"}>{isOn ? "Enabled" : "Disabled"}</Badge><Switch checked={isOn} onCheckedChange={(v) => updateLocalValue(item.key, String(v))} /></div>
    }
    if (item.value_type === "integer" || item.value_type === "float") {
      return <div className="space-y-1"><Input type="number" value={item.value} onChange={(e) => updateLocalValue(item.key, e.target.value)} className="w-32 text-right" /><div className="flex gap-2 text-xs text-muted-foreground">{item.min_value !== null && <span>Min: {item.min_value}</span>}{item.max_value !== null && <span>Max: {item.max_value}</span>}</div></div>
    }
    return <Input type="text" value={item.value} onChange={(e) => updateLocalValue(item.key, e.target.value)} className="w-64" />
  }

  const modifiedCount = Object.keys(pendingChanges).length
  const filteredConfigs = configs.filter((c) => c.category === activeCategory)

  if (isLoading) {
    return <DashboardLayout><div className="flex flex-col items-center justify-center min-h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" /><p className="text-muted-foreground">Loading configuration...</p></div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl sm:text-3xl font-bold">System Configuration</h1><p className="text-muted-foreground mt-1">All parameters are configurable. Changes persist to the database.</p></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isSaving}><RotateCcw className="h-4 w-4 mr-2" />Reload</Button>
            {modifiedCount > 0 && <Button onClick={() => setShowBulkConfirm(true)} disabled={isSaving} className="bg-orange-500 hover:bg-orange-500/90"><Save className="h-4 w-4 mr-2" />Save {modifiedCount} Change{modifiedCount > 1 ? "s" : ""}</Button>}
          </div>
        </div>

        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"><CardContent className="p-4 flex items-start gap-3"><AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" /><div className="text-sm text-yellow-800"><strong>Warning:</strong> Changing thresholds or rules mid-batch may affect volunteer eligibility.</div></CardContent></Card>

        {saveStatus === "saved" && <Card className="border-green-500 bg-green-50"><CardContent className="p-3 flex items-center gap-2 text-green-700 text-sm"><CheckCircle2 className="h-4 w-4" />Configuration saved and active.</CardContent></Card>}

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex-wrap h-auto">
            {categories.map((cat) => {
              const label = CATEGORIES[cat]
              const count = configs.filter((c) => c.category === cat && c.isDirty).length
              return <TabsTrigger key={cat} value={cat} className="relative text-xs capitalize">{label?.label || cat}{count > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0 h-4">{count}</Badge>}</TabsTrigger>
            })}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat}>
              <Card>
                <CardHeader><CardDescription>{CATEGORIES[cat]?.description}</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                  {filteredConfigs.map((item) => (
                    <div key={item.key} className={`pb-6 border-b last:border-0 ${item.isDirty ? "bg-yellow-50/50 -mx-4 px-4 py-3 rounded-lg" : ""}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-sm font-mono font-semibold bg-muted px-2 py-0.5 rounded">{item.key}</code>
                            <Badge variant="outline" className="text-[10px] uppercase">{item.value_type}</Badge>
                            {item.editable_by_admin === false && <Badge variant="secondary" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />Read-only</Badge>}
                            {item.isDirty && <Badge variant="warning" className="text-[10px]">Modified</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1.5">{item.description}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          {renderInput(item)}
                          {item.editable_by_admin !== false && item.isDirty && (
                            <Button size="sm" onClick={() => handleSaveSingle(item.key, item.value)} disabled={isSaving} className="h-8 bg-orange-500 hover:bg-orange-500/90"><Save className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredConfigs.length === 0 && <div className="text-center py-8 text-muted-foreground"><Settings className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>No configuration items in this category.</p></div>}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Dialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Changes</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(pendingChanges).map(([key, value]) => {
                const original = configs.find((c) => c.key === key)
                return <div key={key} className="flex justify-between text-sm p-2 bg-muted rounded"><code>{key}</code><div className="flex gap-2"><span className="text-red-500 line-through">{String(original?.value)}</span><span className="text-green-600 font-medium">{String(value)}</span></div></div>
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkConfirm(false)}>Cancel</Button>
              <Button onClick={handleBulkSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-500/90">{isSaving ? "Saving..." : "Confirm & Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
