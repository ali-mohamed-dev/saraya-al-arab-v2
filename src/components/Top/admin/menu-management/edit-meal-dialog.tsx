'use client'

import { useState, useEffect } from 'react'
import { Edit3, Check, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/Top/shared/image-upload'
import { PREP_AREAS } from '@/lib/saraya/constants'
import type { Meal, PreparationArea } from '@/lib/saraya/types'

interface EditMealDialogProps {
  meal: Meal | null
  onClose: () => void
  onSave: (data: { price?: number; imageUrl: string; preparationArea: PreparationArea }) => Promise<void>
}

export function EditMealDialog({ meal, onClose, onSave }: EditMealDialogProps) {
  const [editPrice, setEditPrice] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editPrepArea, setEditPrepArea] = useState<PreparationArea>('KITCHEN')
  const [saving, setSaving] = useState(false)

  // Sync state when meal changes
  useEffect(() => {
    if (meal) {
      setEditPrice(meal.price.toString())
      setEditImageUrl(meal.imageUrl)
      setEditPrepArea(meal.preparationArea || 'KITCHEN')
    }
  }, [meal])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Bug fix: use `!== ''` instead of truthy check to allow price = 0
      const data: { price?: number; imageUrl: string; preparationArea: PreparationArea } = {
        imageUrl: editImageUrl,
        preparationArea: editPrepArea,
      }
      if (editPrice !== '') {
        data.price = parseFloat(editPrice)
      }
      await onSave(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!meal} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-card border-border/50 max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[#D4AF37] flex items-center gap-2">
            <Edit3 className="h-5 w-5" /> تعديل الطبق
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {meal?.titleAr || meal?.title}
          </DialogDescription>
        </DialogHeader>
        {meal && (
          <div className="space-y-5 py-2">
            <ImageUpload
              value={editImageUrl}
              onChange={(url) => setEditImageUrl(url)}
              label="صورة الطبق"
              aspect="wide"
              placeholder="اضغط لتغيير الصورة"
            />
            <div className="space-y-2">
              <Label className="text-sm font-medium">السعر (ج.م)</Label>
              <Input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="bg-muted border-border/50"
                step="0.01"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">جهة التحضير</Label>
              <div className="flex flex-wrap gap-2">
                {PREP_AREAS.map((area) => (
                  <button
                    key={area.value}
                    onClick={() => setEditPrepArea(area.value as PreparationArea)}
                    className={`rounded-lg border px-4 py-2 text-xs transition-all ${
                      editPrepArea === area.value
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                    }`}
                  >
                    {area.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border/50">إلغاء</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

