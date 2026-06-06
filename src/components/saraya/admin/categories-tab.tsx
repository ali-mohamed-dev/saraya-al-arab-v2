'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag, Plus, Trash2, Edit3, Check, X, Loader2, RefreshCw,
  GripVertical, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface Category {
  id: string
  name: string
  icon: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

const POPULAR_ICONS = ['🍖', '🥩', '🍗', '🍔', '🌮', '🍕', '🥗', '🥘', '🍜', '🍛', '🍣', '🦐', '🥞', '🍰', '🧁', '☕', '🥤', '🍹', '🫖', '🧃', '🥙', '🌯', '🍟', '🫔']

export function CategoriesTab() {
  const { toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  // New category form
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📁')
  const [showIconPicker, setShowIconPicker] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [showEditIconPicker, setShowEditIconPicker] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال اسم التصنيف', variant: 'destructive' })
      return
    }
    setIsAdding(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchCategories()
        setNewName('')
        setNewIcon('📁')
        setShowAddForm(false)
        setShowIconPicker(false)
        toast({ title: '✅ تم الإضافة', description: `تم إضافة تصنيف "${data.name}" بنجاح` })
      } else {
        toast({ title: 'خطأ', description: data.error || 'فشل في إضافة التصنيف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة التصنيف', variant: 'destructive' })
    } finally {
      setIsAdding(false)
    }
  }

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditIcon(cat.icon)
    setShowEditIconPicker(false)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast({ title: 'خطأ', description: 'اسم التصنيف لا يمكن أن يكون فارغاً', variant: 'destructive' })
      return
    }
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), icon: editIcon }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchCategories()
        setEditingId(null)
        setShowEditIconPicker(false)
        toast({ title: '✅ تم التعديل', description: 'تم تعديل التصنيف بنجاح' })
      } else {
        toast({ title: 'خطأ', description: data.error || 'فشل في تعديل التصنيف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تعديل التصنيف', variant: 'destructive' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleToggleActive = async (cat: Category) => {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cat.isActive }),
      })
      if (res.ok) {
        await fetchCategories()
        toast({ title: 'تم التحديث', description: `تم ${!cat.isActive ? 'تفعيل' : 'إيقاف'} التصنيف` })
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const handleDelete = async (cat: Category) => {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        await fetchCategories()
        toast({ title: '🗑️ تم الحذف', description: `تم حذف تصنيف "${cat.name}"` })
      } else {
        toast({ title: 'لا يمكن الحذف', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف التصنيف', variant: 'destructive' })
    }
  }

  const handleSeedCategories = async () => {
    setIsSeeding(true)
    try {
      const res = await fetch('/api/categories/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        await fetchCategories()
        const created = data.results?.filter((r: { action: string }) => r.action === 'created').length ?? 0
        toast({ title: '✅ تم إضافة التصنيفات الافتراضية', description: `تم إضافة ${created} تصنيفات` })
      } else {
        toast({ title: 'خطأ', description: 'فشل في إضافة التصنيفات', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة التصنيفات', variant: 'destructive' })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header Card */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex-row items-center justify-between pb-4">
          <CardTitle className="text-[#D4AF37] flex items-center gap-2">
            <Tag className="h-5 w-5" />
            إدارة تصنيفات الأكل
            <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] text-xs">
              {categories.length} تصنيف
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCategories}
              className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </Button>
            <Button
              size="sm"
              onClick={() => { setShowAddForm(!showAddForm); setShowIconPicker(false) }}
              className="gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431]"
            >
              <Plus className="h-4 w-4" />
              تصنيف جديد
            </Button>
          </div>
        </CardHeader>

        {/* Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 pb-4">
                <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 space-y-4">
                  <p className="text-sm font-medium text-[#D4AF37]">إضافة تصنيف جديد</p>

                  <div className="flex gap-3">
                    {/* Icon selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowIconPicker(!showIconPicker)}
                        className="h-10 w-14 flex items-center justify-center rounded-lg border border-[#D4AF37]/30 bg-background text-xl hover:border-[#D4AF37]/60 transition-colors"
                      >
                        {newIcon}
                      </button>
                      <AnimatePresence>
                        {showIconPicker && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-12 left-0 z-50 bg-card border border-border/50 rounded-xl p-3 shadow-2xl w-64"
                          >
                            <p className="text-xs text-muted-foreground mb-2">اختر أيقونة:</p>
                            <div className="grid grid-cols-6 gap-1">
                              {POPULAR_ICONS.map((icon) => (
                                <button
                                  key={icon}
                                  onClick={() => { setNewIcon(icon); setShowIconPicker(false) }}
                                  className={`text-xl p-1.5 rounded-lg hover:bg-muted transition-colors ${newIcon === icon ? 'bg-[#D4AF37]/20 ring-1 ring-[#D4AF37]/50' : ''}`}
                                >
                                  {icon}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <Input
                                value={newIcon}
                                onChange={(e) => setNewIcon(e.target.value)}
                                placeholder="أو اكتب إيموجي..."
                                className="bg-background border-border/50 text-center h-8 text-sm"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Name input */}
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="مثال: مشويات، مشروبات، طواجن..."
                      className="bg-background border-border/50 flex-1"
                      dir="rtl"
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowAddForm(false); setShowIconPicker(false); setNewName(''); setNewIcon('📁') }}
                      className="gap-2 border-border/50"
                    >
                      <X className="h-3.5 w-3.5" />
                      إلغاء
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAdd}
                      disabled={isAdding || !newName.trim()}
                      className="gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431]"
                    >
                      {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      إضافة
                    </Button>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Categories List */}
      <Card className="border-border/50 bg-card">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-4">
              <Tag className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p className="font-medium">لا توجد تصنيفات حتى الآن</p>
              <p className="text-sm opacity-70">أضف تصنيفات مثل مشويات، مشروبات، طواجن...</p>
              <Button
                onClick={handleSeedCategories}
                disabled={isSeeding}
                className="gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] mx-auto"
              >
                {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                إضافة التصنيفات الافتراضية
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {categories.map((cat, index) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.04 }}
                    className={`group rounded-xl border transition-all ${
                      cat.isActive
                        ? 'border-border/40 bg-muted/20 hover:border-[#D4AF37]/30 hover:bg-muted/40'
                        : 'border-border/20 bg-muted/5 opacity-60'
                    }`}
                  >
                    {editingId === cat.id ? (
                      /* Edit Mode */
                      <div className="p-3 space-y-3">
                        <div className="flex gap-3">
                          {/* Edit icon selector */}
                          <div className="relative">
                            <button
                              onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                              className="h-10 w-14 flex items-center justify-center rounded-lg border border-[#D4AF37]/30 bg-background text-xl hover:border-[#D4AF37]/60 transition-colors"
                            >
                              {editIcon}
                            </button>
                            <AnimatePresence>
                              {showEditIconPicker && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute top-12 left-0 z-50 bg-card border border-border/50 rounded-xl p-3 shadow-2xl w-64"
                                >
                                  <div className="grid grid-cols-6 gap-1">
                                    {POPULAR_ICONS.map((icon) => (
                                      <button
                                        key={icon}
                                        onClick={() => { setEditIcon(icon); setShowEditIconPicker(false) }}
                                        className={`text-xl p-1.5 rounded-lg hover:bg-muted transition-colors ${editIcon === icon ? 'bg-[#D4AF37]/20 ring-1 ring-[#D4AF37]/50' : ''}`}
                                      >
                                        {icon}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-border/50">
                                    <Input
                                      value={editIcon}
                                      onChange={(e) => setEditIcon(e.target.value)}
                                      placeholder="أو اكتب إيموجي..."
                                      className="bg-background border-border/50 text-center h-8 text-sm"
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-background border-[#D4AF37]/30 flex-1 focus:border-[#D4AF37]"
                            dir="rtl"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(cat.id)
                              if (e.key === 'Escape') { setEditingId(null); setShowEditIconPicker(false) }
                            }}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setEditingId(null); setShowEditIconPicker(false) }}
                            className="gap-1 border-border/50 h-8 px-3"
                          >
                            <X className="h-3 w-3" />
                            إلغاء
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(cat.id)}
                            disabled={isSavingEdit}
                            className="gap-1 bg-[#D4AF37] text-black hover:bg-[#C9A431] h-8 px-3"
                          >
                            {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            حفظ
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex items-center gap-3 p-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                        <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{cat.name}</p>
                        </div>
                        <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Switch
                            checked={cat.isActive}
                            onCheckedChange={() => handleToggleActive(cat)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(cat)}
                            className="h-8 w-8 p-0 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cat)}
                            className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-400">ملاحظة</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            التصنيفات التي يضيفها الأدمن هنا ستظهر تلقائياً عند إضافة أطباق جديدة وفي منيو العملاء.
            لا يمكن حذف تصنيف إذا كانت هناك أطباق مرتبطة به.
          </p>
        </div>
      </div>
    </div>
  )
}
