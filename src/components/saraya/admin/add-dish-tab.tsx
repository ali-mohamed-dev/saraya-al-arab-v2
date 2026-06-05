'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, Trash2, Edit2, Check, X, Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/saraya/shared/image-upload'
import { PREP_AREAS } from '@/lib/saraya/constants'
import type { Meal, PreparationArea } from '@/lib/saraya/types'

interface NewMealForm {
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  price: string
  prepTime: string
  category: string
  preparationArea: PreparationArea
  imageUrl: string
}

const defaultMealForm: NewMealForm = {
  title: '', titleAr: '', description: '', descriptionAr: '',
  price: '', prepTime: '15 دقيقة', category: 'مشويات', preparationArea: 'KITCHEN', imageUrl: '',
}

export function AddDishTab() {
  const { toast } = useToast()

  // Category Management State
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('')
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  const [newMeal, setNewMeal] = useState<NewMealForm>({ ...defaultMealForm })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, icon: newCategoryIcon }),
      })
      if (res.ok) {
        const newCat = await res.json()
        await fetchCategories()
        setNewCategoryName('')
        setNewCategoryIcon('')
        setNewMeal(prev => ({ ...prev, category: newCat.name }))
        toast({ title: 'تم الإضافة', description: 'تم إضافة التصنيف بنجاح' })
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: data.error || 'فشل في إضافة التصنيف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة التصنيف', variant: 'destructive' })
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchCategories()
        if (newMeal.category === name) {
          setNewMeal(prev => ({ ...prev, category: '' }))
        }
        toast({ title: 'تم الحذف', description: 'تم حذف التصنيف بنجاح' })
      } else {
        toast({ title: 'خطأ', description: 'فشل في حذف التصنيف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف التصنيف', variant: 'destructive' })
    }
  }

  const handleCreateMeal = async () => {
    const effectiveTitle = newMeal.title || newMeal.titleAr
    if (!effectiveTitle || !newMeal.price || !newMeal.preparationArea) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال اسم الطبق والسعر', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMeal, title: effectiveTitle }),
      })
      if (res.ok) {
        toast({ title: 'تم الإضافة', description: 'تم إضافة الطبق الجديد بنجاح' })
        setNewMeal({ ...defaultMealForm })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في إضافة الطبق', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة الطبق', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card className="border-border/50 bg-card max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-[#D4AF37] flex items-center gap-2">
          <Plus className="h-5 w-5" />
          إضافة طبق جديد
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Management Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className="w-full flex items-center justify-between border-[#D4AF37]/20 bg-[#D4AF37]/5 text-[#D4AF37] hover:bg-[#D4AF37]/10"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            إدارة التصنيفات
          </div>
          {showCategoryManager ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showCategoryManager && (
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                placeholder="🍔"
                className="bg-background border-border/50 w-20 text-center"
              />
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="اسم التصنيف الجديد..."
                className="bg-background border-border/50 flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button onClick={handleAddCategory} size="sm" className="bg-[#D4AF37] text-black hover:bg-[#C9A431]">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-1.5">
                  <span className="text-sm">{cat.icon} {cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="text-muted-foreground hover:text-red-500 transition-colors border-r border-border/50 pr-1 mr-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <ImageUpload
          value={newMeal.imageUrl}
          onChange={(url) => setNewMeal({ ...newMeal, imageUrl: url })}
          label="صورة الطبق"
          aspect="wide"
          placeholder="اضغط لرفع صورة الطبق أو التقط من الكاميرا"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">اسم الطبق (عربي) *</Label>
            <Input
              value={newMeal.titleAr}
              onChange={(e) => setNewMeal({ ...newMeal, titleAr: e.target.value })}
              placeholder="مثال: ريش غنم مشوية"
              className="bg-muted border-border/50"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dish Name (English)</Label>
            <Input
              value={newMeal.title}
              onChange={(e) => setNewMeal({ ...newMeal, title: e.target.value })}
              placeholder="e.g. Grilled Lamb Chops"
              className="bg-muted border-border/50"
              dir="ltr"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">جهة التحضير (المكان الذي سيظهر فيه الطلب) *</Label>
          <div className="flex flex-wrap gap-2">
            {PREP_AREAS.map((area) => (
              <button
                key={area.value}
                onClick={() => setNewMeal({ ...newMeal, preparationArea: area.value as PreparationArea })}
                className={`rounded-lg border px-4 py-2 text-xs transition-all ${
                  newMeal.preparationArea === area.value
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                }`}
              >
                {area.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">الوصف (عربي)</Label>
            <Textarea
              value={newMeal.descriptionAr}
              onChange={(e) => setNewMeal({ ...newMeal, descriptionAr: e.target.value })}
              placeholder="وصف الطبق بالعربية"
              className="bg-muted border-border/50 min-h-[80px]"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description (English)</Label>
            <Textarea
              value={newMeal.description}
              onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
              placeholder="Dish description in English"
              className="bg-muted border-border/50 min-h-[80px]"
              dir="ltr"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">السعر (ج.م) *</Label>
            <Input
              type="number"
              value={newMeal.price}
              onChange={(e) => setNewMeal({ ...newMeal, price: e.target.value })}
              placeholder="0.00"
              className="bg-muted border-border/50"
              step="0.01"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">وقت التحضير</Label>
            <Input
              value={newMeal.prepTime}
              onChange={(e) => setNewMeal({ ...newMeal, prepTime: e.target.value })}
              placeholder="15 دقيقة"
              className="bg-muted border-border/50"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">التصنيف</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setNewMeal({ ...newMeal, category: cat.name })}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                    newMeal.category === cat.name
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Separator className="bg-[#D4AF37]/10" />
        <Button
          onClick={handleCreateMeal}
          disabled={creating || !newMeal.titleAr || !newMeal.price}
          className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] py-6 text-base font-bold disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          إضافة الطبق
        </Button>
      </CardContent>
    </Card>
  )
}
