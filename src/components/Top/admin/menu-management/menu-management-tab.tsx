'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UtensilsCrossed, Plus, Tag, Megaphone, Trash2, Edit3, RefreshCw, Loader2, Package, Search,
  X, Image, Eye, EyeOff, Grid3X3, List, ChefHat, CircleDollarSign
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/Top/shared/image-upload'
import { EditMealDialog } from './edit-meal-dialog'
import { AddonsDialog } from './addons-dialog'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { AddDishTab } from './add-dish-tab'
import { CategoriesTab } from './categories-tab'
import { PromotionsTab } from './promotions-tab'
import { CATEGORIES, PREP_AREAS } from '@/lib/saraya/constants'
import type { Meal, DeleteTarget, PreparationArea } from '@/lib/saraya/types'

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="h-14 w-20 rounded-xl bg-muted/60" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-36 rounded bg-muted/60" />
        <div className="h-3 w-24 rounded bg-muted/40" />
      </div>
      <div className="h-8 w-20 rounded-lg bg-muted/60" />
    </div>
  )
}

export function MenuManagementTab() {
  const { toast } = useToast()

  const [meals, setMeals] = useState<Meal[]>([])
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('الكل')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [addonsMeal, setAddonsMeal] = useState<Meal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const fetchMeals = useCallback(async () => {
    try {
      setLoadingMeals(true)
      const res = await fetch('/api/meals', { cache: 'no-store' })
      if (res.ok) setMeals(await res.json())
    } catch (err) {
      console.error('Failed to fetch meals:', err)
    } finally { setLoadingMeals(false) }
  }, [])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories?all=true')
      if (res.ok) setCategories(await res.json())
    } catch (err) { console.error('Failed to fetch categories:', err) }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      const matchSearch = searchQuery === '' ||
        meal.titleAr?.includes(searchQuery) ||
        meal.title?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = filterCategory === 'الكل' || meal.category === filterCategory
      return matchSearch && matchCategory
    })
  }, [meals, searchQuery, filterCategory])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    meals.forEach(m => { counts[m.category] = (counts[m.category] || 0) + 1 })
    return counts
  }, [meals])

  const handleUpdateMeal = async (data: { price?: number; imageUrl: string; preparationArea: PreparationArea; category?: string }) => {
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
    const newActive = !meal.isActive
    setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, isActive: newActive } : m))
    try {
      const res = await fetch(`/api/meals/${meal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      })
      if (res.ok) {
        toast({ title: 'تم التحديث', description: `تم ${newActive ? 'تفعيل' : 'إيقاف'} الطبق` })
      } else {
        setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, isActive: !newActive } : m))
        const err = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (err as { error?: string }).error || 'فشل تحديث حالة الطبق', variant: 'destructive' })
      }
    } catch {
      setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, isActive: !newActive } : m))
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    }
  }

  const handleDeleteConfirm = (type: DeleteTarget['type'], id: string) => {
    if (type === 'meal') handleDeleteMeal(id)
  }

  const activeMeals = meals.filter(m => m.isActive).length
  const totalMeals = meals.length

  return (
    <Tabs defaultValue="dishes" dir="rtl" className="w-full">
      {/* ── Tabs List ──────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pb-3 mb-4 border-b border-border/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/5 border border-orange-500/10 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">إدارة المنيو</h1>
            <p className="text-[11px] text-muted-foreground">{totalMeals} طبق · {activeMeals} نشط · {categories.length} تصنيف</p>
          </div>
        </div>
        <TabsList className="flex w-full gap-1 bg-muted/40 p-1 rounded-xl overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="dishes" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm flex-1">
            <UtensilsCrossed className="h-4 w-4" />
            الأطباق
          </TabsTrigger>
          <TabsTrigger value="add" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm flex-1">
            <Plus className="h-4 w-4" />
            إضافة طبق
          </TabsTrigger>
          <TabsTrigger value="categories" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm flex-1">
            <Tag className="h-4 w-4" />
            التصنيفات
          </TabsTrigger>
          <TabsTrigger value="promos" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm flex-1">
            <Megaphone className="h-4 w-4" />
            العروض
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ── Dishes Tab ──────────────────────────────── */}
      <TabsContent value="dishes">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'إجمالي الأطباق', value: totalMeals, icon: UtensilsCrossed, color: 'from-blue-500/20 to-blue-600/5 border-blue-500/10 text-blue-400' },
            { label: 'نشط', value: activeMeals, icon: Eye, color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/10 text-emerald-400' },
            { label: 'مخفي', value: totalMeals - activeMeals, icon: EyeOff, color: 'from-red-500/20 to-red-600/5 border-red-500/10 text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl border bg-gradient-to-br ${stat.color} p-3 sm:p-4`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 opacity-60" />
              </div>
              <motion.span key={stat.value} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                className="text-xl sm:text-2xl font-bold">
                {stat.value}
              </motion.span>
            </div>
          ))}
        </div>

        <Card className="border-border/30 bg-gradient-to-br from-card to-muted/5 overflow-hidden">
          <CardHeader className="pb-0 pt-5 px-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-[#D4AF37]" />
                <p className="font-bold text-sm">الأطباق</p>
                <Badge variant="outline" className="border-border/30 text-[10px] h-5">
                  {filteredMeals.length}/{totalMeals}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-border/30 bg-muted/30 p-0.5">
                  <button onClick={() => setViewMode('list')}
                    className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-[#D4AF37] text-black' : 'text-muted-foreground hover:text-foreground'}`}>
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setViewMode('grid')}
                    className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#D4AF37] text-black' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Grid3X3 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={fetchMeals}
                  className="h-8 w-8 p-0 border-border/30 rounded-lg">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
            {/* Search & Filter */}
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن طبق..."
                  className="bg-muted/30 border-border/30 pr-10 h-9 text-sm rounded-xl"
                  dir="rtl" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button key="الكل"
                  onClick={() => setFilterCategory('الكل')}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all ${
                    filterCategory === 'الكل'
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-sm'
                      : 'border-border/30 bg-muted/30 text-muted-foreground hover:border-[#D4AF37]/30'
                  }`}>
                  الكل
                </button>
                {categories.map((cat) => {
                  const count = categoryCounts[cat.name] || 0
                  return (
                    <button key={cat.name}
                      onClick={() => setFilterCategory(cat.name)}
                      className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all flex items-center gap-1.5 ${
                        filterCategory === cat.name
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-sm'
                          : 'border-border/30 bg-muted/30 text-muted-foreground hover:border-[#D4AF37]/30'
                      }`}>
                      {cat.name}
                      <span className={`text-[9px] ${filterCategory === cat.name ? 'text-[#D4AF37]/60' : 'text-muted-foreground/50'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-5 pt-4">
            <ScrollArea className="h-[55vh]">
              {loadingMeals ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : filteredMeals.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="py-16 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    {searchQuery ? (
                      <Search className="h-10 w-10 text-muted-foreground/20" />
                    ) : (
                      <UtensilsCrossed className="h-10 w-10 text-muted-foreground/20" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? `لا توجد نتائج لـ "${searchQuery}"`
                      : meals.length === 0
                        ? 'لا توجد أطباق حالياً'
                        : `لا توجد أطباق في تصنيف "${filterCategory}"`
                    }
                  </p>
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs text-[#D4AF37]">
                      مسح البحث
                    </Button>
                  )}
                </motion.div>
              ) : viewMode === 'grid' ? (
                /* ── Grid View ────────── */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <AnimatePresence mode="popLayout">
                    {filteredMeals.map((meal) => {
                      const prepArea = PREP_AREAS.find(a => a.value === meal.preparationArea)
                      return (
                        <motion.div key={meal.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                          <Card className={`border-border/30 overflow-hidden h-full transition-all hover:shadow-md hover:border-border/50 group ${!meal.isActive ? 'opacity-60' : ''}`}>
                            <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                              {meal.imageUrl ? (
                                <img src={meal.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Image className="h-8 w-8 text-muted-foreground/20" />
                                </div>
                              )}
                              <div className="absolute top-2 left-2 z-10">
                                <Switch checked={meal.isActive}
                                  onCheckedChange={() => handleToggleMealActive(meal)}
                                  className={meal.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'} />
                              </div>
                              <div className="absolute bottom-2 right-2">
                                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-border/30 text-[9px] h-5 px-1.5">
                                  {meal.category}
                                </Badge>
                              </div>
                            </div>
                            <CardContent className="p-3 space-y-2">
                              <div>
                                <p className="font-bold text-sm truncate leading-tight">{meal.titleAr || meal.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate dir-ltr">{meal.title}</p>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#D4AF37] text-sm">{meal.price.toFixed(0)} ج.م</span>
                                {prepArea && (
                                  <span className="text-[9px] font-medium text-muted-foreground/60 flex items-center gap-1">
                                    <ChefHat className="h-3 w-3" />
                                    {prepArea.label}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 pt-1">
                                <button onClick={() => setAddonsMeal(meal)}
                                  className="flex-1 h-7 rounded-lg border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 text-[10px] font-medium transition-all flex items-center justify-center gap-1">
                                  <Package className="h-3 w-3" />إضافات
                                </button>
                                <button onClick={() => setEditingMeal(meal)}
                                  className="h-7 w-7 rounded-lg border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all flex items-center justify-center">
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button onClick={() => setDeleteTarget({ type: 'meal', id: meal.id, name: meal.titleAr || meal.title })}
                                  className="h-7 w-7 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                /* ── List View ────────── */
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-right py-3 px-3 text-[10px] font-bold text-muted-foreground">الطبق</th>
                        <th className="text-right py-3 px-3 text-[10px] font-bold text-muted-foreground">التصنيف</th>
                        <th className="text-left py-3 px-3 text-[10px] font-bold text-muted-foreground">السعر</th>
                        <th className="text-center py-3 px-3 text-[10px] font-bold text-muted-foreground">جهة التحضير</th>
                        <th className="text-center py-3 px-3 text-[10px] font-bold text-muted-foreground">الحالة</th>
                        <th className="text-center py-3 px-3 text-[10px] font-bold text-muted-foreground">إضافات</th>
                        <th className="text-center py-3 px-3 text-[10px] font-bold text-muted-foreground">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {filteredMeals.map((meal) => {
                          const prepArea = PREP_AREAS.find(a => a.value === meal.preparationArea)
                          return (
                            <motion.tr key={meal.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                              className={`border-b border-border/10 transition-all hover:bg-muted/20 ${!meal.isActive ? 'opacity-50' : ''}`}>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  {meal.imageUrl ? (
                                    <img src={meal.imageUrl} alt="" className="h-10 w-14 rounded-lg object-cover border border-border/20 shrink-0" />
                                  ) : (
                                    <div className="h-10 w-14 rounded-lg bg-muted/30 border border-border/20 flex items-center justify-center shrink-0">
                                      <UtensilsCrossed className="h-4 w-4 text-muted-foreground/30" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-sm">{meal.titleAr || meal.title}</p>
                                    <p className="text-[10px] text-muted-foreground/60 dir-ltr">{meal.title}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant="outline" className="border-[#D4AF37]/20 text-[#D4AF37] text-[9px] h-5">
                                  {meal.category}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-[#D4AF37] text-sm whitespace-nowrap">{meal.price.toFixed(2)} ج.م</span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {prepArea ? (
                                  <span className={`text-[10px] font-bold ${prepArea.color} flex items-center justify-center gap-1`}>
                                    <ChefHat className="h-3 w-3" />
                                    {prepArea.label}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/50">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <Switch checked={meal.isActive}
                                    onCheckedChange={() => handleToggleMealActive(meal)}
                                    className={meal.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'} />
                                  <span className={`text-[9px] leading-none ${meal.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {meal.isActive ? 'ظاهر' : 'مخفي'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button onClick={() => setAddonsMeal(meal)}
                                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 text-[10px] font-medium transition-all whitespace-nowrap">
                                  <Package className="h-3 w-3" /> إضافات
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => setEditingMeal(meal)}
                                    className="h-8 w-8 rounded-lg border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all flex items-center justify-center">
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => setDeleteTarget({ type: 'meal', id: meal.id, name: meal.titleAr || meal.title })}
                                    className="h-8 w-8 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Mobile Cards ────────── */}
              {viewMode === 'list' && (
                <div className="md:hidden space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredMeals.map((meal) => {
                      const prepArea = PREP_AREAS.find(a => a.value === meal.preparationArea)
                      return (
                        <motion.div key={meal.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                          className={`rounded-xl border border-border/30 bg-gradient-to-br from-muted/20 to-transparent p-3 transition-all hover:shadow-sm ${!meal.isActive ? 'opacity-60' : ''}`}
                          dir="rtl">
                          <div className="flex items-start gap-3">
                            {meal.imageUrl ? (
                              <img src={meal.imageUrl} alt="" className="h-14 w-18 rounded-xl object-cover border border-border/20 shrink-0" />
                            ) : (
                              <div className="h-14 w-18 rounded-xl bg-muted/30 border border-border/20 flex items-center justify-center shrink-0">
                                <UtensilsCrossed className="h-5 w-5 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-sm truncate">{meal.titleAr || meal.title}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{meal.title}</p>
                                </div>
                                <Switch checked={meal.isActive}
                                  onCheckedChange={() => handleToggleMealActive(meal)}
                                  className={`shrink-0 ${meal.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <Badge variant="outline" className="border-[#D4AF37]/20 text-[#D4AF37] text-[9px] h-5">
                                  {meal.category}
                                </Badge>
                                {prepArea && (
                                  <span className={`text-[9px] font-medium ${prepArea.color} flex items-center gap-0.5`}>
                                    <ChefHat className="h-3 w-3" />
                                    {prepArea.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20">
                            <span className="font-bold text-[#D4AF37] text-sm">{meal.price.toFixed(2)} ج.م</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setAddonsMeal(meal)}
                                className="h-8 px-3 rounded-lg border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 text-[10px] font-medium transition-all flex items-center gap-1">
                                <Package className="h-3 w-3" /> إضافات
                              </button>
                              <button onClick={() => setEditingMeal(meal)}
                                className="h-8 w-8 rounded-lg border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all flex items-center justify-center">
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setDeleteTarget({ type: 'meal', id: meal.id, name: meal.titleAr || meal.title })}
                                className="h-8 w-8 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <EditMealDialog meal={editingMeal} onClose={() => setEditingMeal(null)} onSave={handleUpdateMeal} categories={categories} />
        <AddonsDialog meal={addonsMeal} onClose={() => setAddonsMeal(null)} />
        <DeleteConfirmDialog deleteTarget={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} />
      </TabsContent>

      <TabsContent value="add">
        <AddDishTab />
      </TabsContent>

      <TabsContent value="categories">
        <CategoriesTab />
      </TabsContent>

      <TabsContent value="promos">
        <PromotionsTab />
      </TabsContent>
    </Tabs>
  )
}
