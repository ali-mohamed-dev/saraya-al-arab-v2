'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UtensilsCrossed, Trash2, Edit3, RefreshCw, Loader2, Package, Search
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/Top/shared/image-upload'
import { EditMealDialog } from './edit-meal-dialog'
import { AddonsDialog } from './addons-dialog'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { CATEGORIES, PREP_AREAS } from '@/lib/saraya/constants'
import type { Meal, DeleteTarget, PreparationArea } from '@/lib/saraya/types'

export function MenuManagementTab() {
  const { toast } = useToast()

  // Meals state
  const [meals, setMeals] = useState<Meal[]>([])
  const [loadingMeals, setLoadingMeals] = useState(true)

  // Categories state
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('الكل')

  // Edit meal dialog
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)

  // Addons dialog
  const [addonsMeal, setAddonsMeal] = useState<Meal | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  // Fetch meals
  const fetchMeals = useCallback(async () => {
    try {
      setLoadingMeals(true)
      const res = await fetch('/api/meals')
      if (res.ok) setMeals(await res.json())
    } catch (err) {
      console.error('Failed to fetch meals:', err)
    } finally {
      setLoadingMeals(false)
    }
  }, [])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) setCategories(await res.json())
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // Bug fix: useMemo for filteredMeals
  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      const matchSearch = searchQuery === '' ||
        meal.titleAr?.includes(searchQuery) ||
        meal.title?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = filterCategory === 'الكل' || meal.category === filterCategory
      return matchSearch && matchCategory
    })
  }, [meals, searchQuery, filterCategory])

  // Meal CRUD handlers
  const handleUpdateMeal = async (data: { price?: number; imageUrl: string; preparationArea: PreparationArea }) => {
    if (!editingMeal) return
    try {
      const updateData: Record<string, unknown> = { ...data }
      const res = await fetch(`/api/meals/${editingMeal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      if (res.ok) {
        toast({ title: 'تم التحديث بنجاح', description: 'تم تحديث بيانات الطبق' })
        setEditingMeal(null)
        fetchMeals()
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحديث البيانات', variant: 'destructive' })
    }
  }

  const handleDeleteMeal = async (id: string) => {
  try {
    const res = await fetch(`/api/meals/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'تم الحذف', description: 'تم حذف الطبق بنجاح' })
      fetchMeals()
    } else {
      const data = await res.json().catch(() => ({ error: 'فشل في حذف الطبق' }))
      toast({ title: 'خطأ', description: data.error || 'فشل في حذف الطبق', variant: 'destructive' })
    }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    }
    setDeleteTarget(null)
  }

  const handleToggleMealActive = async (meal: Meal) => {
    try {
      const res = await fetch(`/api/meals/${meal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !meal.isActive }),
      })
      if (res.ok) {
        toast({ title: 'تم التحديث', description: `تم ${!meal.isActive ? 'تفعيل' : 'إيقاف'} الطبق` })
        fetchMeals()
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const handleDeleteConfirm = (type: DeleteTarget['type'], id: string) => {
    if (type === 'meal') handleDeleteMeal(id)
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-[#D4AF37] flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5" />
          إدارة الأطباق ({filteredMeals.length}/{meals.length})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMeals}
          className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          تحديث
        </Button>
      </CardHeader>
      <CardContent>
        {/* Search & Filter */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن طبق..."
              className="bg-muted border-border/50 pr-9"
              dir="rtl"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['الكل', ...categories.map(c => c.name)].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-lg border px-3 py-1 text-xs transition-all ${
                  filterCategory === cat
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loadingMeals ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <UtensilsCrossed className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>{meals.length === 0 ? 'لا توجد أطباق حالياً' : 'لا توجد نتائج للبحث'}</p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh] overflow-y-auto">
            {/* Desktop: Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-right">الصورة</TableHead>
                    <TableHead className="text-right">الطبق</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">إضافات</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredMeals.map((meal) => (
                      <motion.tr
                        key={meal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`border-border/30 hover:bg-muted/30 ${!meal.isActive ? 'opacity-50' : ''}`}
                      >
                        <TableCell className="text-right">
                          {meal.imageUrl ? (
                            <img src={meal.imageUrl} alt="" className="h-12 w-16 rounded-lg object-cover border border-[#D4AF37]/20" />
                          ) : (
                            <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-muted border border-border/30">
                              <UtensilsCrossed className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-semibold">{meal.titleAr || meal.title}</p>
                            <p className="text-xs text-muted-foreground">{meal.title}</p>
                            <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] mt-1 text-[10px]">
                              {meal.category}
                            </Badge>
                            <div className="mt-1">
                              <span className={`text-[10px] font-bold ${PREP_AREAS.find(a => a.value === meal.preparationArea)?.color}`}>
                                جهة التحضير: {PREP_AREAS.find(a => a.value === meal.preparationArea)?.label || 'غير محدد'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-[#D4AF37]">{meal.price.toFixed(2)} ج.م</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch checked={meal.isActive} onCheckedChange={() => handleToggleMealActive(meal)} />
                            <span className={`text-[10px] ${meal.isActive ? 'text-green-400' : 'text-red-400'}`}>
                              {meal.isActive ? 'ظاهر' : 'مخفي'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAddonsMeal(meal)}
                            className="gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-8 px-3"
                          >
                            <Package className="h-3 w-3" />
                            الإضافات
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMeal(meal)}
                              className="gap-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8 px-3"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteTarget({ type: 'meal', id: meal.id, name: meal.titleAr || meal.title })}
                              className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 px-3"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-3 p-1">
              <AnimatePresence>
                {filteredMeals.map((meal) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`rounded-xl border border-border/30 bg-muted/20 p-3 ${!meal.isActive ? 'opacity-50' : ''}`}
                    dir="rtl"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {meal.imageUrl ? (
                        <img src={meal.imageUrl} alt="" className="h-16 w-20 rounded-lg object-cover border border-[#D4AF37]/20 flex-shrink-0" />
                      ) : (
                        <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-muted border border-border/30 flex-shrink-0">
                          <UtensilsCrossed className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{meal.titleAr || meal.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{meal.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] text-[10px]">
                            {meal.category}
                          </Badge>
                          <span className="font-bold text-[#D4AF37] text-sm">{meal.price.toFixed(2)} ج.م</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <Switch checked={meal.isActive} onCheckedChange={() => handleToggleMealActive(meal)} />
                        <span className={`text-[10px] ${meal.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {meal.isActive ? 'ظاهر' : 'مخفي'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddonsMeal(meal)}
                        className="flex-1 gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-9"
                      >
                        <Package className="h-3.5 w-3.5" />
                        الإضافات
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingMeal(meal)}
                        className="flex-1 gap-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-9"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget({ type: 'meal', id: meal.id, name: meal.titleAr || meal.title })}
                        className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 px-3"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Dialogs */}
      <EditMealDialog
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSave={handleUpdateMeal}
      />
      <AddonsDialog
        meal={addonsMeal}
        onClose={() => setAddonsMeal(null)}
      />
      <DeleteConfirmDialog
        deleteTarget={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  )
}
