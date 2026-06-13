'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/Top/shared/image-upload'
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

  // Category state (fetched from API)
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([])

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
        {/* Categories hint */}
        {categories.length === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-400">
            <Tag className="h-4 w-4 flex-shrink-0" />
            لا توجد تصنيفات بعد — اذهب إلى تاب &quot;التصنيفات&quot; لإضافتها أولاً
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

