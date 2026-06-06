'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, QrCode, RefreshCw, Loader2, Copy, Check, Armchair, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  id: string
  number: number
  name: string
  secretCode: string
  seats: number
  area: string
  isActive: boolean
  createdAt: string
}

export function TableManagement() {
  const { toast } = useToast()
  const [tables, setTables] = useState<TableItem[]>([])
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Add table form
  const [newNumber, setNewNumber] = useState('')
  const [newName, setNewName] = useState('')
  const [newSeats, setNewSeats] = useState('4')
  const [newArea, setNewArea] = useState('صالة رئيسية')
  const [saving, setSaving] = useState(false)

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables')
      if (res.ok) setTables(await res.json())
    } catch (err) {
      console.error('Failed to fetch tables:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchActiveOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = (await res.json()).map(transformOrder)
        // الطاولة تعتبر مشغولة لو ليها أوردر مش (تم التسليم أو ملغي)
        setActiveOrders(data.filter((o: any) => 
          o.type === 'DINE_IN' && 
          !['DELIVERED', 'CANCELLED'].includes(o.status)
        ))
      }
    } catch (err) {
      console.error('Failed to fetch active orders:', err)
    }
  }, [])

  useEffect(() => { 
    fetchTables()
    fetchActiveOrders()
    const interval = setInterval(fetchActiveOrders, 10000)
    return () => clearInterval(interval)
  }, [fetchTables, fetchActiveOrders])

  const addTable = async () => {
    if (!newNumber) return
    setSaving(true)
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: parseInt(newNumber),
          name: newName,
          seats: parseInt(newSeats) || 4,
          area: newArea,
        }),
      })
      if (res.ok) {
        toast({ title: 'تم إضافة الطاولة بنجاح' })
        setShowAddDialog(false)
        setNewNumber('')
        setNewName('')
        setNewSeats('4')
        setNewArea('صالة رئيسية')
        fetchTables()
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteTable = async (id: string) => {
    try {
      await fetch(`/api/tables/${id}`, { method: 'DELETE' })
      toast({ title: 'تم حذف الطاولة' })
      fetchTables()
    } catch {
      toast({ title: 'خطأ', description: 'فشل حذف الطاولة', variant: 'destructive' })
    }
  }

  const regenerateCode = async (id: string) => {
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateCode: true }),
      })
      if (res.ok) {
        toast({ title: 'تم تجديد كود الطاولة' })
        fetchTables()
      }
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
    // Generate a URL that pre-fills the table code
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}?table=${table.number}&code=${table.secretCode}`
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#D4AF37] flex items-center gap-2">
            <Armchair className="h-5 w-5" />
            إدارة الطاولات
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            كل طاولة ليها كود سري سري - الزبون لازم يمسح QR أو يدخل الكود عشان يطلب
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}
          className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
          <Plus className="h-4 w-4" />
          إضافة طاولة
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-[#D4AF37]/20 bg-[#D4AF37]/5">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-[#D4AF37]">{tables.length}</p>
            <p className="text-xs text-muted-foreground">إجمالي الطاولات</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{tables.filter(t => t.isActive).length}</p>
            <p className="text-xs text-muted-foreground">نشطة</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{tables.reduce((s, t) => s + t.seats, 0)}</p>
            <p className="text-xs text-muted-foreground">إجمالي الكراسي</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <Card className="border-border/40 bg-card">
          <CardContent className="p-12 text-center">
            <Armchair className="mx-auto mb-4 h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground">لا توجد طاولات مسجلة</p>
            <p className="text-xs text-muted-foreground/60 mt-1">أضف طاولات واطبع QR codes لكل واحدة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map(table => {
            const tableOrders = activeOrders.filter(o => o.tableNumber === String(table.number))
            const isOccupied = tableOrders.length > 0
            
            return (
            <Card key={table.id} className={`border-border/40 bg-card transition-all ${isOccupied ? 'border-red-500/30' : 'hover:border-[#D4AF37]/30'}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-lg ${
                      isOccupied ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-[#D4AF37]/10 text-[#D4AF37]'
                    }`}>
                      {table.number}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{table.name || `طاولة ${table.number}`}</p>
                      <p className="text-xs text-muted-foreground">{table.area} • {table.seats} كراسي</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={table.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-muted text-muted-foreground'}>
                      {table.isActive ? 'نشطة' : 'معطلة'}
                    </Badge>
                    {isOccupied && (
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/20 animate-pulse">
                        مشغولة ({tableOrders.length})
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Secret Code */}
                <div className="flex items-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-2">
                  <span className="text-xs text-muted-foreground">الكود:</span>
                  <code className="flex-1 text-center font-mono text-sm font-bold text-[#D4AF37] tracking-widest">
                    {table.secretCode}
                  </code>
                  <button onClick={() => copyCode(table.secretCode)} className="text-muted-foreground hover:text-[#D4AF37]">
                    {copiedCode === table.secretCode ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline"
                    onClick={() => { setSelectedTable(table); setShowQrDialog(true) }}
                    className="flex-1 gap-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs">
                    <QrCode className="h-3.5 w-3.5" />
                    QR Code
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => regenerateCode(table.id)}
                    className="gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => deleteTable(table.id)}
                    className="text-muted-foreground hover:text-red-400 text-xs h-8 w-8 p-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      {/* Add Table Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border/50" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37]">إضافة طاولة جديدة</DialogTitle>
            <DialogDescription>هيتولد كود سري تلقائياً لكل طاولة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>رقم الطاولة *</Label>
                <Input type="number" value={newNumber} onChange={e => setNewNumber(e.target.value)}
                  placeholder="5" className="bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label>عدد الكراسي</Label>
                <Input type="number" value={newSeats} onChange={e => setNewSeats(e.target.value)}
                  placeholder="4" className="bg-muted/50 border-border/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>اسم الطاولة (اختياري)</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="مثال: VIP" className="bg-muted/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label>المنطقة</Label>
              <Input value={newArea} onChange={e => setNewArea(e.target.value)}
                placeholder="صالة رئيسية" className="bg-muted/50 border-border/50" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
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
        <DialogContent className="bg-card border-border/50" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37] flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code - طاولة {selectedTable?.number}
            </DialogTitle>
            <DialogDescription>
              {selectedTable 
                ? `اطبع هذا الكود وضعه على طاولة رقم ${selectedTable.number} ليتمكن الزبائن من الطلب مباشرة.`
                : 'تحميل بيانات الطاولة...'}
            </DialogDescription>
          </DialogHeader>
          {selectedTable && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* QR Code using external API (free, no auth needed) */}
              <div className="rounded-xl border-2 border-[#D4AF37]/30 bg-white p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQrUrl(selectedTable))}`}
                  alt={`QR Code - Table ${selectedTable.number}`}
                  className="h-[200px] w-[200px]"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  طاولة رقم: <strong className="text-foreground">{selectedTable.number}</strong>
                  {selectedTable.name && ` - ${selectedTable.name}`}
                </p>
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-4 py-2">
                  <span className="text-xs text-muted-foreground">الكود:</span>
                  <code className="font-mono text-lg font-bold text-[#D4AF37] tracking-widest">
                    {selectedTable.secretCode}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  امسح الكود أو ادخل الكود في الموقع لطلب من الطاولة
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
