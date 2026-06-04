'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Star, Package, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { Meal, AddOn } from '@/lib/saraya/types'

interface AddonsDialogProps {
  meal: Meal | null
  onClose: () => void
}

export function AddonsDialog({ meal, onClose }: AddonsDialogProps) {
  const { toast } = useToast()
  const [addons, setAddons] = useState<AddOn[]>([])
  const [loadingAddons, setLoadingAddons] = useState(false)
  const [newAddon, setNewAddon] = useState({
    title: '', titleAr: '', price: '', isRecommended: false, imageUrl: '',
  })
  const [creatingAddon, setCreatingAddon] = useState(false)

  const fetchAddons = useCallback(async (mealId: string) => {
    try {
      setLoadingAddons(true)
      const res = await fetch(`/api/meals/${mealId}/addons?admin=true`)
      if (res.ok) setAddons(await res.json())
    } catch (err) {
      console.error('Failed to fetch addons:', err)
    } finally {
      setLoadingAddons(false)
    }
  }, [])

  useEffect(() => {
    if (meal) {
      setNewAddon({ title: '', titleAr: '', price: '', isRecommended: false, imageUrl: '' })
      fetchAddons(meal.id)
    }
  }, [meal, fetchAddons])

  const handleCreateAddon = async () => {
    if (!meal || !newAddon.title || !newAddon.price) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال اسم الإضافة والسعر', variant: 'destructive' })
      return
    }
    setCreatingAddon(true)
    try {
      const res = await fetch('/api/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newAddon, mealId: meal.id, price: parseFloat(newAddon.price) }),
      })
      if (res.ok) {
        toast({ title: 'تم الإضافة', description: 'تم إضافة الإضافة الجديدة' })
        setNewAddon({ title: '', titleAr: '', price: '', isRecommended: false, imageUrl: '' })
        fetchAddons(meal.id)
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة الإضافة', variant: 'destructive' })
    } finally {
      setCreatingAddon(false)
    }
  }

  const handleDeleteAddon = async (id: string) => {
    if (!meal) return
    try {
      const res = await fetch(`/api/addons/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'تم الحذف', description: 'تم حذف الإضافة' })
        fetchAddons(meal.id)
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف الإضافة', variant: 'destructive' })
    }
  }

  const handleToggleAddonRecommended = async (addon: AddOn) => {
    try {
      const res = await fetch(`/api/addons/${addon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRecommended: !addon.isRecommended }),
      })
      if (res.ok) {
        toast({ title: 'تم التحديث', description: `تم ${!addon.isRecommended ? 'تفعيل' : 'إلغاء'} التوصية` })
        if (meal) fetchAddons(meal.id)
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const handleToggleAddonActive = async (addon: AddOn) => {
    try {
      const res = await fetch(`/api/addons/${addon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !addon.isActive }),
      })
      if (res.ok) {
        toast({ title: 'تم التحديث', description: `تم ${!addon.isActive ? 'تفعيل' : 'إلغاء تفعيل'} الإضافة` })
        if (meal) fetchAddons(meal.id)
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={!!meal} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-orange-400 flex items-center gap-2">
            <Package className="h-5 w-5" />
            إضافات: {meal?.titleAr || meal?.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            أضف إضافات وتوصيات تزيد المبيعات
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Add new add-on form */}
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-bold text-orange-400 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إضافة جديدة
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">اسم الإضافة (عربي)</Label>
                  <Input
                    value={newAddon.titleAr}
                    onChange={(e) => setNewAddon({ ...newAddon, titleAr: e.target.value })}
                    placeholder="صلصة ثوم"
                    className="bg-muted border-border/50 h-9"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Add-on Name (English)</Label>
                  <Input
                    value={newAddon.title}
                    onChange={(e) => setNewAddon({ ...newAddon, title: e.target.value })}
                    placeholder="Garlic Sauce"
                    className="bg-muted border-border/50 h-9"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">السعر (ج.م) *</Label>
                  <Input
                    type="number"
                    value={newAddon.price}
                    onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value })}
                    placeholder="10"
                    className="bg-muted border-border/50 h-9"
                    step="0.01"
                    dir="ltr"
                  />
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <Switch
                    checked={newAddon.isRecommended}
                    onCheckedChange={(v) => setNewAddon({ ...newAddon, isRecommended: v })}
                  />
                  <Label className="text-xs flex items-center gap-1">
                    <Star className="h-3 w-3 text-orange-400" />
                    توصية الشيف
                  </Label>
                </div>
              </div>
              <Button
                onClick={handleCreateAddon}
                disabled={creatingAddon || !newAddon.title || !newAddon.price}
                className="w-full gap-2 bg-orange-500 text-white hover:bg-orange-600 h-9"
              >
                {creatingAddon ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                إضافة
              </Button>
            </CardContent>
          </Card>

          {/* Existing add-ons list */}
          {loadingAddons ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
            </div>
          ) : addons.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="mx-auto mb-2 h-10 w-10 opacity-20" />
              <p className="text-sm">لا توجد إضافات لهذا الطبق بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-muted-foreground">الإضافات الحالية ({addons.length})</h4>
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    addon.isRecommended ? 'border-orange-500/30 bg-orange-500/5' : 'border-border/30 bg-muted/20'
                  } ${!addon.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{addon.titleAr || addon.title}</p>
                      {addon.isRecommended && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] gap-1">
                          <Star className="h-2.5 w-2.5" />
                          توصية
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{addon.title}</p>
                  </div>
                  <span className="text-sm font-bold text-[#D4AF37]">{addon.price.toFixed(2)} ج.م</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleAddonRecommended(addon)}
                      className={`h-7 w-7 p-0 ${addon.isRecommended ? 'text-orange-400' : 'text-muted-foreground'}`}
                    >
                      <Star className={`h-3.5 w-3.5 ${addon.isRecommended ? 'fill-orange-400' : ''}`} />
                    </Button>
                    <Switch
                      checked={addon.isActive}
                      onCheckedChange={() => handleToggleAddonActive(addon)}
                      className="scale-75"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAddon(addon.id)}
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
