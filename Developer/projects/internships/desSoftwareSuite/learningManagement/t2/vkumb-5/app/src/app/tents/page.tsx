import { useState, useEffect, useCallback } from "react"
import { Tent, Plus, Loader2, AlertCircle, RefreshCw, Search, Save, X, Pencil, Trash2, Building2, Users, BedDouble } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { tentApi } from "@/lib/api"

interface TentItem {
  id: string;
  tentNumber: string;
  name: string;
  sector: string;
  gender: string;
  capacity: number;
  occupied: number;
  location: string;
  status: string;
  facilities: string[];
  notes: string;
}

export default function TentsPage() {
  const [tents, setTents] = useState<TentItem[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<TentItem>>({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [createData, setCreateData] = useState({
    tentNumber: "",
    name: "",
    sector: "general" as string,
    gender: "male" as string,
    capacity: 24,
    location: "",
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const [tentsData, statsData] = await Promise.all([
        tentApi.list(),
        tentApi.getStats(),
      ])
      setTents(tentsData)
      setStats(statsData)
    } catch (e: any) {
      setError("Failed to load tent data: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStartEdit = (tent: TentItem) => {
    setEditingId(tent.id)
    setEditData({ ...tent })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    setIsSaving(true)
    try {
      await tentApi.update({ id: editingId, ...editData })
      setEditingId(null)
      setEditData({})
      await fetchData()
    } catch (e: any) {
      setError("Failed to save: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreate = async () => {
    setIsSaving(true)
    try {
      await tentApi.create(createData)
      setShowCreateDialog(false)
      setCreateData({ tentNumber: "", name: "", sector: "general", gender: "male", capacity: 24, location: "" })
      await fetchData()
    } catch (e: any) {
      setError("Failed to create tent: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await tentApi.delete(id)
      setShowDeleteDialog(null)
      await fetchData()
    } catch (e: any) {
      setError("Failed to delete: " + e.message)
    }
  }

  const handleBulkCreate = async () => {
    setIsSaving(true)
    try {
      await tentApi.bulkCreate({ count: 15, capacityPerTent: 24, femaleSectorEnd: 7 })
      setShowBulkDialog(false)
      await fetchData()
    } catch (e: any) {
      setError("Failed to bulk create: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredTents = tents.filter((t) =>
    !searchQuery ||
    t.tentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge variant="success" className="capitalize">{status}</Badge>
      case "maintenance": return <Badge className="bg-yellow-500 capitalize">{status}</Badge>
      case "inactive": return <Badge variant="secondary" className="capitalize">{status}</Badge>
      default: return <Badge variant="outline" className="capitalize">{status}</Badge>
    }
  }

  const occupancyColor = (occupied: number, capacity: number) => {
    const pct = (occupied / capacity) * 100
    if (pct >= 90) return "text-red-600"
    if (pct >= 70) return "text-yellow-600"
    return "text-green-600"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Tent Management</h1>
          <p className="text-muted-foreground">Manage volunteer accommodation, capacity, and gender allocation</p>
        </div>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Tent className="h-4 w-4" /> How to Use Tent Management
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>View Stats:</strong> See overall occupancy, capacity, and gender distribution at a glance.</li>
              <li><strong>Inline Editing:</strong> Click the pencil icon on any tent to edit capacity, gender, status, and more in real-time.</li>
              <li><strong>Add Tents:</strong> Use "Add Tent" for individual tents or "Bulk Create" to generate multiple tents automatically.</li>
              <li><strong>Gender Sectors:</strong> Tents are color-coded by gender - Female (pink), Male (blue), Mixed (purple).</li>
            </ul>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError("")}><X className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg"><Tent className="h-5 w-5 text-orange-500" /></div>
                <div><p className="text-2xl font-bold">{stats.totalTents}</p><p className="text-xs text-muted-foreground">Total Tents</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg"><BedDouble className="h-5 w-5 text-blue-500" /></div>
                <div><p className="text-2xl font-bold">{stats.availableBeds}</p><p className="text-xs text-muted-foreground">Available Beds</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg"><Users className="h-5 w-5 text-purple-500" /></div>
                <div><p className="text-2xl font-bold">{stats.totalOccupied}</p><p className="text-xs text-muted-foreground">Occupied</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg"><Building2 className="h-5 w-5 text-green-500" /></div>
                <div>
                  <p className={`text-2xl font-bold ${occupancyColor(stats.totalOccupied, stats.totalCapacity)}`}>
                    {stats.occupancyRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">Occupancy</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tent number, name, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setShowBulkDialog(true)}><Building2 className="h-4 w-4 mr-1" />Bulk Create</Button>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-orange-500 hover:bg-orange-500/90"><Plus className="h-4 w-4 mr-1" />Add Tent</Button>
          </div>
        </div>

        {/* Tent Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
            <p className="text-muted-foreground">Loading tents...</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredTents.map((tent) => (
              <Card key={tent.id} className={tent.gender === "female" ? "border-pink-200" : tent.gender === "male" ? "border-blue-200" : "border-purple-200"}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tent className={`h-5 w-5 ${tent.gender === "female" ? "text-pink-500" : tent.gender === "male" ? "text-blue-500" : "text-purple-500"}`} />
                      <CardTitle className="text-base">{tent.tentNumber}</CardTitle>
                    </div>
                    {getStatusBadge(tent.status)}
                  </div>
                  <CardDescription>{tent.name} {tent.location && `- ${tent.location}`}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editingId === tent.id ? (
                    /* Inline Edit Mode */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium">Capacity</label>
                          <Input type="number" value={editData.capacity} onChange={(e) => setEditData({ ...editData, capacity: parseInt(e.target.value) || 1 })} className="h-8" min={1} max={100} />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Occupied</label>
                          <Input type="number" value={editData.occupied} onChange={(e) => setEditData({ ...editData, occupied: parseInt(e.target.value) || 0 })} className="h-8" min={0} max={editData.capacity} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium">Gender</label>
                          <Select value={editData.gender} onValueChange={(v) => setEditData({ ...editData, gender: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium">Status</label>
                          <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Location</label>
                        <Input value={editData.location || ""} onChange={(e) => setEditData({ ...editData, location: e.target.value })} className="h-8" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" />Save</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}><X className="h-3 w-3 mr-1" />Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Occupancy</span>
                          <span className={occupancyColor(tent.occupied, tent.capacity)}>
                            {tent.occupied} / {tent.capacity} ({Math.round((tent.occupied / tent.capacity) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (tent.occupied / tent.capacity) * 100 >= 90 ? "bg-red-500" :
                              (tent.occupied / tent.capacity) * 100 >= 70 ? "bg-yellow-500" : "bg-green-500"
                            }`}
                            style={{ width: `${(tent.occupied / tent.capacity) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Gender: <span className="capitalize font-medium">{tent.gender}</span></span>
                          <span>Sector: <span className="capitalize font-medium">{tent.sector}</span></span>
                        </div>
                      </div>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleStartEdit(tent)}>
                          <Pencil className="h-3 w-3 mr-1" />Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => setShowDeleteDialog(tent.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredTents.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Tent className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No tents found. Create your first tent to get started.</p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4 bg-orange-500 hover:bg-orange-500/90"><Plus className="h-4 w-4 mr-1" />Create Tent</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Tent</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-medium">Tent Number *</label><Input value={createData.tentNumber} onChange={(e) => setCreateData({ ...createData, tentNumber: e.target.value })} placeholder="T-016" /></div>
              <div><label className="text-xs font-medium">Name</label><Input value={createData.name} onChange={(e) => setCreateData({ ...createData, name: e.target.value })} placeholder="Tent 16" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-medium">Gender</label>
                <Select value={createData.gender} onValueChange={(v) => setCreateData({ ...createData, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="mixed">Mixed</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-medium">Capacity</label><Input type="number" value={createData.capacity} onChange={(e) => setCreateData({ ...createData, capacity: parseInt(e.target.value) || 24 })} /></div>
            </div>
            <div><label className="text-xs font-medium">Location</label><Input value={createData.location} onChange={(e) => setCreateData({ ...createData, location: e.target.value })} placeholder="Sector C - Row 1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving || !createData.tentNumber} className="bg-orange-500 hover:bg-orange-500/90">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Tent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Create Tents</DialogTitle>
            <DialogDescription>Automatically generate multiple tents with gender-segregated sectors.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will create 15 tents (T-001 to T-015) with 7 female-sector tents and 8 male-sector tents, each with 24-bed capacity.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkCreate} disabled={isSaving} className="bg-orange-500 hover:bg-orange-500/90">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <><Building2 className="h-4 w-4 mr-2" />Generate 15 Tents</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tent</DialogTitle>
            <DialogDescription>Are you sure you want to delete this tent? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
            <Button onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
