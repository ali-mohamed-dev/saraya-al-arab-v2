'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, QrCode, RefreshCw, Loader2, Copy, Check, Armchair, User,
  Search, X, ChevronDown, ChevronUp, MapPin, Users, Wifi, Download,
  CircleCheck, CircleAlert
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { Order } from '@/lib/saraya/types'
import { transformOrder } from '@/lib/saraya/helpers'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface TableItem {
  id: string; number: number; name: string; secretCode: string
  seats: number; area: string; isActive: boolean; createdAt: string
}

export function TableManagement() {
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)
  const [tables, setTables] = useState<TableItem[]>([])
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [currentShiftId, setCurrentShiftId] = useState('')
  const [search, setSearch] = useState('')
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const [areas, setAreas] = useState<string[]>(['صالة رئيسية'])
  const [showAddArea, setShowAddArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [savingArea, setSavingArea] = useState(false)
  const initialLoadDone = useRef(false)

  const [newNumber, setNewNumber] = useState('')
  const [newName, setNewName] = useState('')
  const [newSeats, setNewSeats] = useState('4')
  const [newArea, setNewArea] = useState('صالة رئيسية')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (!e.ctrlKey && !e.metaKey && e.key === '/' && e.target === document.body)) {
        e.preventDefault(); searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/areas')
      if (!res.ok) {
        console.error('fetchAreas failed:', res.status, await res.text().catch(() => ''))
        return
      }
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setAreas(data)
      }
    } catch (e) { console.error('fetchAreas error:', e) }
  }, [])

  const addArea = async (name: string) => {
    if (!name.trim()) return
    setSavingArea(true)
    try {
      const res = await fetch('/api/settings/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setAreas(updated)
        setNewArea(name.trim())
        setShowAddArea(false); setNewAreaName('')
        toast({ title: '✅ تمت إضافة المنطقة' })
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setSavingArea(false) }
  }

  const deleteArea = async (name: string) => {
    if (!window.confirm(`حذف المنطقة "${name}"؟`)) return
    try {
      const res = await fetch('/api/settings/areas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setAreas(await res.json())
        toast({ title: '🗑️ تم حذف المنطقة' })
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    }
  }

  const fetchShiftStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts?current=true')
      if (res.ok) { const shift = await res.json(); setCurrentShiftId(shift?.id || '') }
    } catch { /* ignore */ }
  }, [])

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables')
      if (res.ok) {
        const data: TableItem[] = await res.json()
        setTables(data)
        if (!initialLoadDone.current) {
          initialLoadDone.current = true
          setExpandedAreas(new Set(data.map(t => t.area || 'أخرى')))
        }
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  const fetchActiveOrders = useCallback(async () => {
    try {
      const url = currentShiftId ? `/api/orders?shiftId=${currentShiftId}` : '/api/orders'
      const res = await fetch(url)
      if (res.ok) {
        const data = (await res.json()).map(transformOrder)
        setActiveOrders(data.filter((o: any) =>
          o.type === 'DINE_IN' && !['DELIVERED', 'CANCELLED'].includes(o.status)
        ))
      }
    } catch { /* ignore */ }
  }, [currentShiftId])

  useEffect(() => {
    const fetchAll = () => { fetchAreas(); fetchShiftStatus(); fetchTables(); fetchActiveOrders() }
    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [fetchAreas, fetchShiftStatus, fetchTables, fetchActiveOrders])

  const addTable = async () => {
    if (!newNumber) return
    setSaving(true)
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: parseInt(newNumber), name: newName,
          seats: parseInt(newSeats) || 4, area: newArea,
        }),
      })
      if (res.ok) {
        toast({ title: '✅ تمت الإضافة' })
        setShowAddDialog(false); setNewNumber(''); setNewName(''); setNewSeats('4'); setNewArea('صالة رئيسية')
        fetchTables()
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const deleteTable = async (id: string) => {
    const table = tables.find(t => t.id === id)
    if (!window.confirm(`هل أنت متأكد من حذف "${table?.name || id}"؟`)) return
    try {
      const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '🗑️ تم الحذف' }); fetchTables()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل الحذف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    }
  }

  const regenerateCode = async (id: string) => {
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateCode: true }),
      })
      if (res.ok) { toast({ title: 'تم تجديد الكود' }); fetchTables() }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تجديد الكود', variant: 'destructive' })
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getQrUrl = (table: TableItem) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}?table=${table.number}&code=${table.secretCode}`
  }

  const activeTableOrders = (table: TableItem) =>
    activeOrders.filter(o => o.tableNumber === String(table.number))

  const isTableOccupied = (table: TableItem) => activeTableOrders(table).length > 0

  // Group by area
  const grouped = tables.reduce((acc, t) => {
    const g = t.area || 'أخرى'
    if (!acc[g]) acc[g] = []
    acc[g].push(t)
    return acc
  }, {} as Record<string, TableItem[]>)

  const sortedAreas = Object.keys(grouped).sort()

  const searchFilter = (t: TableItem) =>
    String(t.number).includes(search) || t.name.includes(search) || t.area.includes(search)

  // Stats
  const totalTables = tables.length
  const activeCount = tables.filter(t => t.isActive).length
  const occupiedCount = tables.filter(isTableOccupied).length
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
          <p className="text-sm text-muted-foreground">جاري تحميل الطاولات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Armchair className="h-5 w-5 sm:h-6 sm:w-6 text-[#D4AF37]" />
            إدارة الطاولات
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{totalTables} طاولة · {totalSeats} كرسي</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}
          className="w-full sm:w-auto gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold shadow-lg shadow-[#D4AF37]/20 text-sm sm:text-base">
          <Plus className="h-4 w-4" />
          إضافة طاولة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={Armchair} label="إجمالي الطاولات" value={String(totalTables)} color="text-[#D4AF37]" bg="bg-[#D4AF37]/10" />
        <StatCard icon={CircleCheck} label="نشطة" value={String(activeCount)} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={User} label="مشغولة" value={String(occupiedCount)} color="text-red-400" bg="bg-red-500/10" />
        <StatCard icon={Users} label="طاقة الكراسي" value={String(totalSeats)} color="text-blue-400" bg="bg-blue-500/10" />
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#D4AF37] transition-colors z-10" />
        <Input
          ref={searchRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث برقم الطاولة أو الاسم... (Ctrl+K)"
          className="pr-12 bg-muted/30 border-border/40 h-12 text-base rounded-xl focus-visible:ring-[#D4AF37]/30 focus-visible:border-[#D4AF37]/50 transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd className="absolute left-12 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">/</kbd>
      </div>

      {/* Tables List */}
      {tables.length === 0 ? (
        <div className="py-20 text-center">
          <Armchair className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
          <p className="text-base text-muted-foreground">لا توجد طاولات مسجلة</p>
          <p className="text-xs text-muted-foreground/60 mt-1">أضف طاولات واطبع QR codes لكل واحدة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAreas.map(area => {
            const filtered = grouped[area].filter(searchFilter)
            if (filtered.length === 0) return null
            const isExpanded = expandedAreas.has(area)
            const areaOccupied = filtered.filter(isTableOccupied).length
            return (
              <Card key={area} className="border-border/40 overflow-hidden">
                <button
                  onClick={() => {
                    const next = new Set(expandedAreas)
                    isExpanded ? next.delete(area) : next.add(area)
                    setExpandedAreas(next)
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <MapPin className="h-4 w-4 text-[#D4AF37] shrink-0" />
                    <span className="font-bold text-xs sm:text-sm">{area}</span>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] border-border/30 text-muted-foreground">{filtered.length}</Badge>
                    {areaOccupied > 0 && (
                      <Badge className="text-[9px] sm:text-[10px] bg-red-500/10 text-red-400 border-red-500/20">{areaOccupied} مشغولة</Badge>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden">
                      <div className="grid gap-3 p-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map(table => {
                          const occupied = isTableOccupied(table)
                          const orders = activeTableOrders(table)
                          return (
                            <motion.div key={table.id} layout
                              className={`rounded-xl border p-3 sm:p-4 transition-all ${
                                occupied
                                  ? 'border-red-500/30 bg-gradient-to-br from-red-500/[0.05] to-transparent'
                                  : table.isActive
                                  ? 'border-border/40 bg-card hover:border-[#D4AF37]/30 hover:shadow-md hover:shadow-[#D4AF37]/5'
                                  : 'border-border/30 bg-muted/20 opacity-60'
                              }`}>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold shrink-0 ${
                                    occupied
                                      ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                                      : table.isActive
                                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                                      : 'bg-muted/30 text-muted-foreground border border-border/30'
                                  }`}>
                                    {table.number}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{table.name || `طاولة ${table.number}`}</p>
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                                      <Users className="h-3 w-3 shrink-0" />{table.seats} كراسي
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {!table.isActive && (
                                    <Badge variant="outline" className="text-[10px] border-gray-400/30 text-gray-400">معطلة</Badge>
                                  )}
                                  {occupied ? (
                                    <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px] flex items-center gap-1 px-1.5 sm:px-2">
                                      <CircleAlert className="h-3 w-3" />
                                      <span className="hidden sm:inline">مشغولة</span>
                                    </Badge>
                                  ) : table.isActive ? (
                                    <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-400 flex items-center gap-1 px-1.5 sm:px-2">
                                      <CircleCheck className="h-3 w-3" />
                                      <span className="hidden sm:inline">متاحة</span>
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>

                              {/* Active orders info */}
                              {occupied && orders.length > 0 && (
                                <div className="mb-3 space-y-1">
                                  {orders.map(o => (
                                    <div key={o.id} className="flex items-center justify-between text-[11px] bg-red-500/5 rounded-lg px-2 py-1">
                                      <span className="text-muted-foreground">#{o.orderNumber}</span>
                                      <Badge variant="outline" className="text-[10px] border-orange-400/20 text-orange-400">
                                        {o.status === 'PENDING' ? 'قيد الانتظار' :
                                         o.status === 'PREPARING' ? 'قيد التحضير' :
                                         o.status === 'READY' ? 'جاهز' : o.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Secret Code */}
                              <div className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-muted/20 p-1.5 sm:p-2 mb-3">
                                <Wifi className="h-3 w-3 text-muted-foreground shrink-0" />
                                <code className="flex-1 text-center font-mono text-[10px] sm:text-xs font-bold text-foreground/80 tracking-wider truncate">
                                  {table.secretCode}
                                </code>
                                <button onClick={() => copyCode(table.secretCode)}
                                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors shrink-0 p-0.5">
                                  {copiedCode === table.secretCode
                                    ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5">
                                <Button size="sm"
                                  onClick={() => { setSelectedTable(table); setShowQrDialog(true) }}
                                  className="flex-1 gap-1 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 h-8 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2">
                                  <QrCode className="h-3.5 w-3.5 shrink-0" />
                                  <span className="hidden sm:inline">QR</span>
                                </Button>
                                <Button size="sm" variant="outline"
                                  onClick={() => regenerateCode(table.id)}
                                  className="h-8 w-8 p-0 border-blue-400/20 text-blue-400 hover:bg-blue-500/10 shrink-0">
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost"
                                  onClick={() => deleteTable(table.id)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 shrink-0">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Table Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border/50 sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#D4AF37]" />
              إضافة طاولة جديدة
            </DialogTitle>
            <DialogDescription>هيتولد كود سري تلقائياً لكل طاولة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">رقم الطاولة *</Label>
                <Input type="number" value={newNumber} onChange={e => setNewNumber(e.target.value)}
                  placeholder="5" className="bg-muted/30 border-border/40 h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">عدد الكراسي</Label>
                <Input type="number" value={newSeats} onChange={e => setNewSeats(e.target.value)}
                  placeholder="4" className="bg-muted/30 border-border/40 h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">اسم الطاولة (اختياري)</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="VIP مثلًا" className="bg-muted/30 border-border/40 h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">المنطقة</Label>
              {!showAddArea ? (
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <select value={newArea} onChange={e => setNewArea(e.target.value)}
                      className="w-full rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-sm h-10 appearance-none">
                      {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <button onClick={() => setShowAddArea(true)}
                    className="h-10 w-10 rounded-lg border border-dashed border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 flex items-center justify-center transition-colors shrink-0">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteArea(newArea)} disabled={areas.length <= 1}
                    className="h-10 w-10 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-500/10 flex items-center justify-center disabled:opacity-30 transition-colors shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <Input value={newAreaName} onChange={e => setNewAreaName(e.target.value)}
                    placeholder="اكتب اسم المنطقة الجديدة..."
                    className="bg-muted/30 border-[#D4AF37]/40 h-10 text-sm flex-1"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') addArea(newAreaName) }} />
                  <Button onClick={() => addArea(newAreaName)} disabled={savingArea || !newAreaName.trim()}
                    className="bg-emerald-500 text-white hover:bg-emerald-400 h-10 px-3 text-xs gap-1 shrink-0">
                    {savingArea ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    حفظ
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowAddArea(false); setNewAreaName('') }}
                    className="h-10 text-xs shrink-0">إلغاء</Button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                {!showAddArea ? 'اختر منطقة موجودة أو أضف واحدة جديدة' : 'سيتم إضافة المنطقة وحفظها'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}
              className="border-border/40">إلغاء</Button>
            <Button onClick={addTable} disabled={saving || !newNumber}
              className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="bg-card border-border/50 sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#D4AF37]" />
              طاولة {selectedTable?.number}
            </DialogTitle>
            <DialogDescription>
              {selectedTable
                ? `اطبع الكود وضعه على طاولة رقم ${selectedTable.number} ليتمكن الزبائن من الطلب`
                : 'جاري التحميل...'}
            </DialogDescription>
          </DialogHeader>
          {selectedTable && (
            <div className="flex flex-col items-center gap-3 sm:gap-4 py-2 sm:py-4">
              <div className="rounded-xl border-2 border-[#D4AF37]/20 bg-white p-2 sm:p-4 shadow-lg max-w-full">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQrUrl(selectedTable))}`}
                  alt={`QR Table ${selectedTable.number}`}
                  className="h-[140px] w-[140px] sm:h-[200px] sm:w-[200px]"
                  onError={(e) => { (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#999" font-size="14" font-family="sans-serif">QR Service Unavailable</text></svg>`)}` }}
                />
              </div>
              <div className="w-full space-y-2 text-center">
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span>رقم <strong className="text-foreground">{selectedTable.number}</strong></span>
                  {selectedTable.name && <span>· {selectedTable.name}</span>}
                  <span>· <strong>{selectedTable.seats}</strong> كراسي</span>
                </div>
                <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2 sm:px-4 py-1.5 sm:py-2 max-w-full">
                  <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">الكود:</span>
                  <code className="font-mono text-sm sm:text-lg font-bold text-[#D4AF37] tracking-wider truncate">
                    {selectedTable.secretCode}
                  </code>
                  <button onClick={() => copyCode(selectedTable.secretCode)}
                    className="text-muted-foreground hover:text-[#D4AF37] shrink-0">
                    {copiedCode === selectedTable.secretCode
                      ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                      : <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  امسح الكود أو ادخله في الموقع للطلب من الطاولة
                </p>
              </div>
              <Button variant="outline" className="w-full gap-2 border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs sm:text-sm"
                onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(getQrUrl(selectedTable))}`, '_blank')}>
                <Download className="h-4 w-4" />
                تحميل QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: any; label: string; value: string; color: string; bg: string
}) {
  return (
    <div className={`rounded-xl ${bg} border border-border/40 p-4 transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
