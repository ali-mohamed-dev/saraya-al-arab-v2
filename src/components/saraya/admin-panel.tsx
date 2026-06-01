'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UtensilsCrossed, Plus, Megaphone, LogOut,
  Trash2, Edit3, RefreshCw, Check, X, Loader2, Star, Package, Search,
  Clock, ChefHat, CheckCircle, DollarSign, ClipboardList,
  AlertTriangle, Maximize, Minimize, Flame, Utensils, Phone, MapPin, Timer,
  Users, Shield, TrendingDown, Download, PlayCircle, StopCircle, UserPlus, KeyRound,
  BadgeCheck
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/saraya/image-upload'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Meal {
  id: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  price: number
  prepTime: string
  category: string
  categoryAr: string
  imageUrl: string
  isActive: boolean
}

interface Promotion {
  id: string
  bannerImageUrl: string
  title: string
  titleAr: string
  isActive: boolean
}

interface AddOn {
  id: string
  mealId: string
  title: string
  titleAr: string
  price: number
  imageUrl: string
  isRecommended: boolean
  isActive: boolean
}

interface OrderItem {
  id: string
  mealId: string
  mealTitle: string
  mealTitleAr: string
  quantity: number
  price: number
  addOns?: { title: string; titleAr: string; price: number }[]
  imageUrl?: string
}

interface Order {
  id: string
  orderNumber: number
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'READY_TO_PAY' | 'DELIVERED' | 'CANCELLED'
  customerName: string
  customerPhone: string
  deliveryAddress?: string
  tableNumber?: string
  items: OrderItem[]
  subtotal: number
  serviceCharge: number
  total: number
  notes?: string
  cancelledBy?: string
  createdAt: string
  updatedAt: string
}

interface OrderStats {
  totalOrders: number
  pendingOrders: number
  preparingOrders: number
  readyOrders: number
  readyToPayOrders: number
  cancelledOrders: number
  todayRevenue: number
  todayOrders: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'مشويات', label: 'مشويات / Grills' },
  { value: 'مقبلات', label: 'مقبلات / Appetizers' },
  { value: 'ساندويتشات', label: 'ساندويتشات / Sandwiches' },
  { value: 'حلويات', label: 'حلويات / Desserts' },
  { value: 'مشروبات', label: 'مشروبات / Beverages' },
  { value: 'أطباق رئيسية', label: 'أطباق رئيسية / Main Courses' },
  { value: 'اصناف الصالة', label: 'اصناف الصالة / Hall Items' },
]

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'جديد', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  CONFIRMED: { label: 'مؤكد', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  PREPARING: { label: 'قيد التحضير', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  READY: { label: 'جاهز', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  READY_TO_PAY: { label: 'جاهز للدفع', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  DELIVERED: { label: 'تم التسليم', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  CANCELLED: { label: 'ملغي', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
}

const ORDER_TYPE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DINE_IN: { label: 'صالة', icon: <Utensils className="h-3.5 w-3.5" />, color: 'text-blue-400' },
  TAKEAWAY: { label: 'تيكاوي', icon: <Package className="h-3.5 w-3.5" />, color: 'text-orange-400' },
  DELIVERY: { label: 'ديليفري', icon: <Phone className="h-3.5 w-3.5" />, color: 'text-purple-400' },
}

const STATUS_FILTERS = [
  { value: 'ALL', label: 'الكل' },
  { value: 'PENDING', label: 'جديد' },
  { value: 'CONFIRMED', label: 'مؤكد' },
  { value: 'PREPARING', label: 'قيد التحضير' },
  { value: 'READY', label: 'جاهز' },
  { value: 'READY_TO_PAY', label: 'جاهز للدفع' },
  { value: 'DELIVERED', label: 'تم التسليم' },
  { value: 'CANCELLED', label: 'ملغي' },
]

const TYPE_FILTERS = [
  { value: 'ALL', label: 'الكل' },
  { value: 'DINE_IN', label: 'صالة' },
  { value: 'TAKEAWAY', label: 'تيكاوي' },
  { value: 'DELIVERY', label: 'ديليفري' },
]

// ── Helper ────────────────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, Math.floor((now - then) / 1000))

  if (diff < 60) return `منذ ${diff} ثانية`
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`
  return `منذ ${Math.floor(diff / 86400)} يوم`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

function getElapsedMinutes(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

// Transform raw API order data to frontend Order interface
function transformOrder(raw: Record<string, unknown>): Order {
  const items = (raw.items as Array<Record<string, unknown>> | undefined) ?? []
  return {
    id: (raw.id as string) || '',
    orderNumber: (raw.orderNumber as number) ?? 0,
    type: (raw.type as string) as Order['type'],
    status: (raw.status as string) as Order['status'],
    customerName: (raw.customerName as string) || '',
    customerPhone: (raw.customerPhone as string) || '',
    deliveryAddress: (raw.deliveryAddress as string) || undefined,
    tableNumber: (raw.tableNumber as string) || undefined,
    subtotal: Number(raw.subtotal ?? 0),
    serviceCharge: Number(raw.serviceCharge ?? 0),
    total: Number(raw.total ?? 0),
    notes: (raw.notes as string) || undefined,
    cancelledBy: (raw.cancelledBy as string) || undefined,
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) || new Date().toISOString(),
    items: items.map((item) => {
      let parsedAddOns: { title: string; titleAr: string; price: number }[] | undefined
      try {
        parsedAddOns = typeof item.addOns === 'string'
          ? JSON.parse(item.addOns || '[]')
          : (item.addOns as { title: string; titleAr: string; price: number }[] | undefined)
      } catch {
        parsedAddOns = undefined
      }
      return {
        id: (item.id as string) || '',
        mealId: (item.mealId as string) || '',
        mealTitle: (item.mealTitle as string) || '',
        mealTitleAr: (item.mealTitleAr as string) || '',
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
        imageUrl: (item.imageUrl as string) || undefined,
        addOns: parsedAddOns,
      }
    }),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()
  const adminUsername = typeof window !== 'undefined' ? sessionStorage.getItem('saraya-staff-username') || 'admin' : 'admin'
  // Track last order counts for polling-based real-time refresh
  const lastPendingCountRef = useRef(0)
  const lastReadyToPayCountRef = useRef(0)

  // ── Meals state ───────────────────────────────────────────────────────────
  const [meals, setMeals] = useState<Meal[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [loadingPromos, setLoadingPromos] = useState(true)

  // Editing meal
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Add-ons management
  const [addonsMeal, setAddonsMeal] = useState<Meal | null>(null)
  const [addons, setAddons] = useState<AddOn[]>([])
  const [loadingAddons, setLoadingAddons] = useState(false)
  const [newAddon, setNewAddon] = useState({ title: '', titleAr: '', price: '', isRecommended: false, imageUrl: '' })
  const [creatingAddon, setCreatingAddon] = useState(false)

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('الكل')

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'meal' | 'promotion' | 'addon', id: string, name: string } | null>(null)

  // New meal form
  const [newMeal, setNewMeal] = useState({
    title: '', titleAr: '', description: '', descriptionAr: '',
    price: '', prepTime: '15 دقيقة', category: 'مشويات', imageUrl: ''
  })
  const [creating, setCreating] = useState(false)

  // New promotion form
  const [newPromo, setNewPromo] = useState({ bannerImageUrl: '', title: '', titleAr: '' })
  const [creatingPromo, setCreatingPromo] = useState(false)

  // ── Orders state ──────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL')
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null)
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null)
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  // ── Kitchen state ─────────────────────────────────────────────────────────
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>([])
  const [loadingKitchen, setLoadingKitchen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [kitchenFlash, setKitchenFlash] = useState(false)
  const kitchenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [relativeTimers, setRelativeTimers] = useState<Record<string, string>>({})

  // ── Fetch meals ───────────────────────────────────────────────────────────
  const fetchMeals = useCallback(async () => {
    try {
      setLoadingMeals(true)
      const res = await fetch('/api/meals')
      if (res.ok) setMeals(await res.json())
    } catch { /* ignore */ } finally { setLoadingMeals(false) }
  }, [])

  const fetchPromotions = useCallback(async () => {
    try {
      setLoadingPromos(true)
      const res = await fetch('/api/promotions')
      if (res.ok) setPromotions(await res.json())
    } catch { /* ignore */ } finally { setLoadingPromos(false) }
  }, [])

  useEffect(() => { fetchMeals() }, [fetchMeals])
  useEffect(() => { fetchPromotions() }, [fetchPromotions])

  // Fetch add-ons when a meal is selected
  const fetchAddons = useCallback(async (mealId: string) => {
    try {
      setLoadingAddons(true)
      const res = await fetch(`/api/meals/${mealId}/addons?admin=true`)
      if (res.ok) setAddons(await res.json())
    } catch { /* ignore */ } finally { setLoadingAddons(false) }
  }, [])

  const openAddonsDialog = (meal: Meal) => {
    setAddonsMeal(meal)
    setNewAddon({ title: '', titleAr: '', price: '', isRecommended: false, imageUrl: '' })
    fetchAddons(meal.id)
  }

  // ── Meal CRUD ─────────────────────────────────────────────────────────────
  const handleUpdateMeal = async () => {
    if (!editingMeal) return
    setSavingId(editingMeal.id)
    try {
      const updateData: Record<string, unknown> = {}
      if (editPrice) updateData.price = parseFloat(editPrice)
      if (editImageUrl !== undefined) updateData.imageUrl = editImageUrl
      const res = await fetch(`/api/meals/${editingMeal.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData),
      })
      if (res.ok) {
        toast({ title: 'تم التحديث بنجاح', description: 'تم تحديث بيانات الطبق' })
        setEditingMeal(null)
        fetchMeals()
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحديث البيانات', variant: 'destructive' })
    } finally { setSavingId(null) }
  }

  const handleDeleteMeal = async (id: string) => {
    try {
      const res = await fetch(`/api/meals/${id}`, { method: 'DELETE' })
      if (res.ok) { toast({ title: 'تم الحذف', description: 'تم حذف الطبق بنجاح' }); fetchMeals() }
    } catch { toast({ title: 'خطأ', description: 'فشل في حذف الطبق', variant: 'destructive' }) }
    setDeleteTarget(null)
  }

  const handleCreateMeal = async () => {
    const effectiveTitle = newMeal.title || newMeal.titleAr
    if (!effectiveTitle || !newMeal.price) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال اسم الطبق والسعر', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMeal, title: effectiveTitle }),
      })
      if (res.ok) {
        toast({ title: 'تم الإضافة', description: 'تم إضافة الطبق الجديد بنجاح' })
        setNewMeal({ title: '', titleAr: '', description: '', descriptionAr: '', price: '', prepTime: '15 دقيقة', category: 'مشويات', imageUrl: '' })
        fetchMeals()
      }
    } catch { toast({ title: 'خطأ', description: 'فشل في إضافة الطبق', variant: 'destructive' }) }
    finally { setCreating(false) }
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
    } catch { toast({ title: 'خطأ', variant: 'destructive' }) }
  }

  // Filtered meals
  const filteredMeals = meals.filter((meal) => {
    const matchSearch = searchQuery === '' ||
      meal.titleAr?.includes(searchQuery) ||
      meal.title?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCategory = filterCategory === 'الكل' || meal.category === filterCategory
    return matchSearch && matchCategory
  })

  // ── Add-on CRUD ───────────────────────────────────────────────────────────
  const handleCreateAddon = async () => {
    if (!addonsMeal || !newAddon.title || !newAddon.price) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال اسم الإضافة والسعر', variant: 'destructive' })
      return
    }
    setCreatingAddon(true)
    try {
      const res = await fetch('/api/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newAddon, mealId: addonsMeal.id, price: parseFloat(newAddon.price) }),
      })
      if (res.ok) {
        toast({ title: 'تم الإضافة', description: 'تم إضافة الإضافة الجديدة' })
        setNewAddon({ title: '', titleAr: '', price: '', isRecommended: false, imageUrl: '' })
        fetchAddons(addonsMeal.id)
      }
    } catch { toast({ title: 'خطأ', description: 'فشل في إضافة الإضافة', variant: 'destructive' }) }
    finally { setCreatingAddon(false) }
  }

  const handleDeleteAddon = async (id: string) => {
    if (!addonsMeal) return
    try {
      const res = await fetch(`/api/addons/${id}`, { method: 'DELETE' })
      if (res.ok) { toast({ title: 'تم الحذف', description: 'تم حذف الإضافة' }); fetchAddons(addonsMeal.id) }
    } catch { toast({ title: 'خطأ', description: 'فشل في حذف الإضافة', variant: 'destructive' }) }
    setDeleteTarget(null)
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
        if (addonsMeal) fetchAddons(addonsMeal.id)
      }
    } catch { toast({ title: 'خطأ', variant: 'destructive' }) }
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
        if (addonsMeal) fetchAddons(addonsMeal.id)
      }
    } catch { toast({ title: 'خطأ', variant: 'destructive' }) }
  }

  // ── Promotion CRUD ────────────────────────────────────────────────────────
  const handleCreatePromo = async () => {
    if (!newPromo.bannerImageUrl) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى رفع صورة البانر', variant: 'destructive' })
      return
    }
    setCreatingPromo(true)
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newPromo, isActive: true }),
      })
      if (res.ok) {
        toast({ title: 'تم الإضافة', description: 'تم إضافة العرض الجديد بنجاح' })
        setNewPromo({ bannerImageUrl: '', title: '', titleAr: '' })
        fetchPromotions()
      }
    } catch { toast({ title: 'خطأ', description: 'فشل في إضافة العرض', variant: 'destructive' }) }
    finally { setCreatingPromo(false) }
  }

  const handleTogglePromo = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/promotions/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) { toast({ title: 'تم التحديث', description: `تم ${!isActive ? 'تفعيل' : 'إلغاء تفعيل'} العرض` }); fetchPromotions() }
    } catch { toast({ title: 'خطأ', variant: 'destructive' }) }
  }

  const handleDeletePromo = async (id: string) => {
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' })
      if (res.ok) { toast({ title: 'تم الحذف', description: 'تم حذف العرض بنجاح' }); fetchPromotions() }
    } catch { toast({ title: 'خطأ', variant: 'destructive' }) }
    setDeleteTarget(null)
  }

  const openEditDialog = (meal: Meal) => {
    setEditingMeal(meal)
    setEditPrice(meal.price.toString())
    setEditImageUrl(meal.imageUrl)
  }

  // ── Orders fetch & update ─────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true)
      const params = new URLSearchParams()
      if (orderStatusFilter !== 'ALL') params.set('status', orderStatusFilter)
      if (orderTypeFilter !== 'ALL') params.set('type', orderTypeFilter)
      if (currentShiftId) params.set('shiftId', currentShiftId)
      const res = await fetch(`/api/orders?${params.toString()}`)
      if (res.ok) {
        const rawData = await res.json()
        const allOrders = rawData.map(transformOrder)
        setOrders(allOrders.filter((order) => order.status !== 'CANCELLED'))
      }
    } catch { /* ignore */ } finally { setLoadingOrders(false) }
  }, [orderStatusFilter, orderTypeFilter, currentShiftId])

  const fetchCancelledOrders = useCallback(async () => {
    if (!currentShiftId) {
      setCancelledOrders([])
      return
    }
    try {
      const params = new URLSearchParams({ status: 'CANCELLED', shiftId: currentShiftId })
      const res = await fetch(`/api/orders?${params.toString()}`)
      if (res.ok) {
        const rawData = await res.json()
        setCancelledOrders(rawData.map(transformOrder))
      }
    } catch { /* ignore */ }
  }, [currentShiftId])

  const fetchStats = useCallback(async (shiftId?: string) => {
    try {
      const params = new URLSearchParams()
      if (shiftId) params.set('shiftId', shiftId)
      const url = `/api/orders/stats${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      if (res.ok) setOrderStats(await res.json())
    } catch { /* ignore */ }
  }, [])

  const printOrder = (order: Order) => {
    const content = `
      <html>
        <head>
          <title>Order #${order.orderNumber}</title>
          <style>body{font-family: sans-serif;direction: rtl;text-align: right;}table{width:100%;border-collapse: collapse;}td,th{padding:8px;border:1px solid #ddd;}h1,h2{margin:0 0 8px;} .muted{color:#666;font-size:0.9rem;}</style>
        </head>
        <body>
          <h1>فاتورة الطلب #${order.orderNumber}</h1>
          <p class="muted">الحالة: ${ORDER_STATUS_MAP[order.status].label}</p>
          <p>الزبون: ${order.customerName}</p>
          <p>الهاتف: ${order.customerPhone || '-'} ${order.tableNumber ? ` | طاولة ${order.tableNumber}` : ''}</p>
          ${order.deliveryAddress ? `<p>العنوان: ${order.deliveryAddress}</p>` : ''}
          <table>
            <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr></thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.mealTitleAr || item.mealTitle}</td>
                  <td>${item.quantity}</td>
                  <td>${(item.price * item.quantity).toFixed(2)} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="muted">الإجمالي: ${order.total.toFixed(2)} ج.م</p>
          ${order.notes ? `<p class="muted">ملاحظات: ${order.notes}</p>` : ''}
          ${order.status === 'CANCELLED' && order.cancelledBy ? `<p class="muted">ملغي بواسطة: ${order.cancelledBy}</p>` : ''}
          <script>window.print();</script>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank', 'width=700,height=900')
    if (printWindow) {
      printWindow.document.write(content)
      printWindow.document.close()
    }
  }

  const fetchCurrentShift = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts?current=true')
      if (res.ok) {
        const shift = await res.json()
        setCurrentShiftId(shift?.id || null)
      } else {
        setCurrentShiftId(null)
      }
    } catch {
      setCurrentShiftId(null)
    }
  }, [])

  useEffect(() => { fetchCurrentShift() }, [fetchCurrentShift])
  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => { fetchCancelledOrders() }, [fetchCancelledOrders])
  useEffect(() => { fetchStats(currentShiftId ?? undefined) }, [fetchStats, currentShiftId])

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      const payload: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'CANCELLED') {
        payload.cancelledBy = adminUsername
      }

      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast({ title: 'تم تحديث حالة الطلب' })
        await fetchOrders()
        await fetchCancelledOrders()
        await fetchStats(currentShiftId ?? undefined)
        await fetchKitchenOrders()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في تحديث الحالة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally { setUpdatingOrderId(null) }
  }

  // ── Kitchen fetch ─────────────────────────────────────────────────────────
  const fetchKitchenOrders = useCallback(async () => {
    try {
      setLoadingKitchen(true)
      const res = await fetch('/api/orders?status=PREPARING')
      const preparing = res.ok ? (await res.json()).map(transformOrder) : []
      try {
        const res2 = await fetch('/api/orders?status=PENDING')
        const pending = res2.ok ? (await res.json()).map(transformOrder) : []
        setKitchenOrders([...pending, ...preparing])
      } catch { setKitchenOrders(preparing) }
    } catch { /* ignore */ } finally { setLoadingKitchen(false) }
  }, [])

  useEffect(() => { fetchKitchenOrders() }, [fetchKitchenOrders])

  // Auto-refresh kitchen every 15 seconds
  useEffect(() => {
    kitchenIntervalRef.current = setInterval(() => {
      fetchKitchenOrders()
    }, 15000)
    return () => { if (kitchenIntervalRef.current) clearInterval(kitchenIntervalRef.current) }
  }, [fetchKitchenOrders])

  // Update relative timers every 30 seconds
  useEffect(() => {
    const updateTimers = () => {
      const allOrders = [...orders, ...kitchenOrders]
      const timers: Record<string, string> = {}
      allOrders.forEach((o) => { timers[o.id] = getRelativeTime(o.createdAt) })
      setRelativeTimers(timers)
    }
    updateTimers()
    const id = setInterval(updateTimers, 30000)
    return () => clearInterval(id)
  }, [orders, kitchenOrders])

  // ── Polling-based real-time (Vercel compatible) ───────────────────────────
  // Poll for new orders every 5 seconds on the admin panel, and refresh only on new orders
  useEffect(() => {
    if (!currentShiftId) return

    const initializeCounts = async () => {
      try {
        const pendingParams = new URLSearchParams({ status: 'PENDING', shiftId: currentShiftId })
        const readyToPayParams = new URLSearchParams({ status: 'READY_TO_PAY', shiftId: currentShiftId })

        const [pendingRes, readyRes] = await Promise.all([
          fetch(`/api/orders?${pendingParams.toString()}`),
          fetch(`/api/orders?${readyToPayParams.toString()}`),
        ])

        if (!pendingRes.ok || !readyRes.ok) return

        const pendingOrders = (await pendingRes.json()).map(transformOrder)
        const readyToPayOrders = (await readyRes.json()).map(transformOrder)

        lastPendingCountRef.current = pendingOrders.length
        lastReadyToPayCountRef.current = readyToPayOrders.length
      } catch { /* ignore */ }
    }

    initializeCounts()

    const pollInterval = setInterval(async () => {
      try {
        const pendingParams = new URLSearchParams({ status: 'PENDING', shiftId: currentShiftId })
        const readyToPayParams = new URLSearchParams({ status: 'READY_TO_PAY', shiftId: currentShiftId })

        const [pendingRes, readyRes] = await Promise.all([
          fetch(`/api/orders?${pendingParams.toString()}`),
          fetch(`/api/orders?${readyToPayParams.toString()}`),
        ])

        if (!pendingRes.ok || !readyRes.ok) return

        const pendingOrders = (await pendingRes.json()).map(transformOrder)
        const readyToPayOrders = (await readyRes.json()).map(transformOrder)

        const pendingChanged = pendingOrders.length > lastPendingCountRef.current
        const readyToPayChanged = readyToPayOrders.length !== lastReadyToPayCountRef.current

        if (pendingChanged || readyToPayChanged) {
          if (pendingChanged) {
            const newOrder = pendingOrders[0]
            toast({ title: 'طلب جديد! 🍽️', description: `طلب رقم #${newOrder.orderNumber}` })
          }
          if (readyToPayChanged && readyToPayOrders.length > lastReadyToPayCountRef.current) {
            toast({ title: 'طلب جاهز للدفع', description: `عدد الطلبات الجاهزة للدفع الآن ${readyToPayOrders.length}` })
          }

          setKitchenFlash(true)
          setTimeout(() => setKitchenFlash(false), 2000)
          lastPendingCountRef.current = pendingOrders.length
          lastReadyToPayCountRef.current = readyToPayOrders.length
          fetchOrders()
          fetchStats(currentShiftId)
          fetchKitchenOrders()
        }
      } catch { /* ignore polling errors */ }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [currentShiftId, fetchOrders, fetchKitchenOrders, fetchStats, toast])

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  // ── Kitchen urgency styling ───────────────────────────────────────────────
  const getUrgencyClasses = (createdAt: string) => {
    const mins = getElapsedMinutes(createdAt)
    if (mins > 15) return 'border-red-500 animate-pulse'
    if (mins > 10) return 'border-orange-500'
    if (mins > 5) return 'border-yellow-500'
    return 'border-border/50'
  }

  const getUrgencyTextColor = (createdAt: string) => {
    const mins = getElapsedMinutes(createdAt)
    if (mins > 15) return 'text-red-400'
    if (mins > 10) return 'text-orange-400'
    if (mins > 5) return 'text-yellow-400'
    return 'text-muted-foreground'
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
              <UtensilsCrossed className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#D4AF37]">لوحة التحكم</h1>
              <p className="text-xs text-muted-foreground">سرايا العرب - إدارة المطعم</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Tabs defaultValue="menu" dir="rtl" className="w-full">
          <TabsList className="mb-6 flex w-full flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="menu" className="flex-1 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">إدارة المنيو</span>
              <span className="sm:hidden">المنيو</span>
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">إضافة طبق</span>
              <span className="sm:hidden">إضافة</span>
            </TabsTrigger>
            <TabsTrigger value="promos" className="flex-1 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">إدارة العروض</span>
              <span className="sm:hidden">العروض</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">إدارة الطلبات</span>
              <span className="sm:hidden">الطلبات</span>
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="flex-1 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm">
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">المطبخ</span>
              <span className="sm:hidden">المطبخ</span>
            </TabsTrigger>
            <TabsTrigger value="shift" className="flex-1 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">الشيفت</span>
              <span className="sm:hidden">الشيفت</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex-1 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">الموظفين</span>
              <span className="sm:hidden">الموظفين</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════════
              Tab 1: Menu Management
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="menu">
            <Card className="border-border/50 bg-card">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-[#D4AF37] flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5" />
                  إدارة الأطباق ({filteredMeals.length}/{meals.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchMeals} className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
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
                    {['الكل', ...CATEGORIES.map(c => c.value)].map((cat) => (
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
                                  <Button size="sm" variant="outline" onClick={() => openAddonsDialog(meal)} className="gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-8 px-3">
                                    <Package className="h-3 w-3" />
                                    الإضافات
                                  </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="sm" variant="outline" onClick={() => openEditDialog(meal)} className="gap-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8 px-3">
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setDeleteTarget({ type: 'meal', id: meal.id, name: meal.titleAr || meal.title })} className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 px-3">
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
                              <Button size="sm" variant="outline" onClick={() => openAddonsDialog(meal)} className="flex-1 gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-9">
                                <Package className="h-3.5 w-3.5" />
                                الإضافات
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openEditDialog(meal)} className="flex-1 gap-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-9">
                                <Edit3 className="h-3.5 w-3.5" />
                                تعديل
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setDeleteTarget({ type: 'meal', id: meal.id, name: meal.titleAr || meal.title })} className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 px-3">
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
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              Tab 2: Add New Dish
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="add">
            <Card className="border-border/50 bg-card max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-[#D4AF37] flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  إضافة طبق جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    <Input value={newMeal.titleAr} onChange={(e) => setNewMeal({ ...newMeal, titleAr: e.target.value })} placeholder="مثال: ريش غنم مشوية" className="bg-muted border-border/50" dir="rtl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Dish Name (English)</Label>
                    <Input value={newMeal.title} onChange={(e) => setNewMeal({ ...newMeal, title: e.target.value })} placeholder="e.g. Grilled Lamb Chops" className="bg-muted border-border/50" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">الوصف (عربي)</Label>
                    <Textarea value={newMeal.descriptionAr} onChange={(e) => setNewMeal({ ...newMeal, descriptionAr: e.target.value })} placeholder="وصف الطبق بالعربية" className="bg-muted border-border/50 min-h-[80px]" dir="rtl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Description (English)</Label>
                    <Textarea value={newMeal.description} onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })} placeholder="Dish description in English" className="bg-muted border-border/50 min-h-[80px]" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">السعر (ر.س) *</Label>
                    <Input type="number" value={newMeal.price} onChange={(e) => setNewMeal({ ...newMeal, price: e.target.value })} placeholder="0.00" className="bg-muted border-border/50" step="0.01" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">وقت التحضير</Label>
                    <Input value={newMeal.prepTime} onChange={(e) => setNewMeal({ ...newMeal, prepTime: e.target.value })} placeholder="15 دقيقة" className="bg-muted border-border/50" dir="rtl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">التصنيف</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setNewMeal({ ...newMeal, category: cat.value })}
                          className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                            newMeal.category === cat.value ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Separator className="bg-[#D4AF37]/10" />
                <Button onClick={handleCreateMeal} disabled={creating || !newMeal.titleAr || !newMeal.price} className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] py-6 text-base font-bold disabled:opacity-50">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  إضافة الطبق
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              Tab 3: Promotions Management
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="promos">
            <div className="space-y-6">
              <Card className="border-border/50 bg-card max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-[#D4AF37] flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    إضافة عرض جديد
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ImageUpload value={newPromo.bannerImageUrl} onChange={(url) => setNewPromo({ ...newPromo, bannerImageUrl: url })} label="صورة البانر *" aspect="banner" placeholder="اضغط لرفع صورة البانر أو التقط من الكاميرا" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">عنوان العرض (عربي)</Label>
                      <Input value={newPromo.titleAr} onChange={(e) => setNewPromo({ ...newPromo, titleAr: e.target.value })} placeholder="عرض خاص - خصم 20%" className="bg-muted border-border/50" dir="rtl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Promotion Title (English)</Label>
                      <Input value={newPromo.title} onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })} placeholder="Special Offer - 20% Off" className="bg-muted border-border/50" dir="ltr" />
                    </div>
                  </div>
                  <Button onClick={handleCreatePromo} disabled={creatingPromo || !newPromo.bannerImageUrl} className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] py-6 text-base font-bold disabled:opacity-50">
                    {creatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    إضافة العرض
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-[#D4AF37] flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    العروض الحالية ({promotions.length})
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchPromotions} className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                    <RefreshCw className="h-3.5 w-3.5" /> تحديث
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingPromos ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>
                  ) : promotions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground"><Megaphone className="mx-auto mb-3 h-12 w-12 opacity-30" /><p>لا توجد عروض حالياً</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence>
                        {promotions.map((promo) => (
                          <motion.div key={promo.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <Card className={`overflow-hidden border ${promo.isActive ? 'border-[#D4AF37]/30' : 'border-border/30 opacity-60'}`}>
                              <div className="relative aspect-[2.5/1]">
                                <img src={promo.bannerImageUrl} alt={promo.titleAr} className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-2 right-3 left-3">
                                  <p className="text-sm font-bold text-[#D4AF37] truncate">{promo.titleAr}</p>
                                  {promo.title && <p className="text-xs text-white/60 truncate">{promo.title}</p>}
                                </div>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <Switch checked={promo.isActive} onCheckedChange={() => handleTogglePromo(promo.id, promo.isActive)} />
                                  <span className={`text-xs ${promo.isActive ? 'text-green-400' : 'text-muted-foreground'}`}>{promo.isActive ? 'نشط' : 'متوقف'}</span>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setDeleteTarget({ type: 'promotion', id: promo.id, name: promo.titleAr || promo.title })} className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 px-2">
                                  <Trash2 className="h-3 w-3" /> حذف
                                </Button>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              Tab 4: Order Management
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="orders">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                  <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-400">{orderStats?.readyToPayOrders ?? 0}</p>
                        <p className="text-xs text-muted-foreground">جاهز للدفع</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <Card className="border-yellow-500/20 bg-yellow-500/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10">
                        <Clock className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{orderStats?.pendingOrders ?? 0}</p>
                        <p className="text-xs text-muted-foreground">طلبات جديدة</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="border-[#D4AF37]/20 bg-[#D4AF37]/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4AF37]/10">
                        <Flame className="h-5 w-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-[#D4AF37]">{orderStats?.preparingOrders ?? 0}</p>
                        <p className="text-xs text-muted-foreground">قيد التحضير</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">{orderStats?.readyOrders ?? 0}</p>
                        <p className="text-xs text-muted-foreground">جاهزة للاستلام</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                  <Card className="border-red-500/20 bg-red-500/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-400">{orderStats?.cancelledOrders ?? 0}</p>
                        <p className="text-xs text-muted-foreground">طلبات ملغاة</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <Card className="border-[#D4AF37]/20 bg-[#D4AF37]/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4AF37]/10">
                        <DollarSign className="h-5 w-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-[#D4AF37]">{(orderStats?.todayRevenue ?? 0).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">{currentShiftId ? 'إيراد الشيفت الحالي (ر.س)' : 'إيراد اليوم (ر.س)'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Filters */}
              <Card className="border-border/50 bg-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#D4AF37] flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      تصفية الطلبات
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { fetchOrders(); fetchStats(currentShiftId ?? undefined) }} className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8">
                        <RefreshCw className="h-3 w-3" />
                        تحديث يدوي
                      </Button>
                      {newOrderAlert && (
                        <span className="rounded-full bg-green-500/10 text-green-500 px-3 py-1 text-xs font-semibold">طلب جديد #{newOrderAlert.orderNumber} وصل</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">حالة الطلب:</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_FILTERS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setOrderStatusFilter(f.value)}
                          className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                            orderStatusFilter === f.value
                              ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                              : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">نوع الطلب:</p>
                    <div className="flex flex-wrap gap-2">
                      {TYPE_FILTERS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setOrderTypeFilter(f.value)}
                          className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                            orderTypeFilter === f.value
                              ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                              : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Orders List */}
              {loadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p>لا توجد طلبات حالياً</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {orders.map((order) => {
                      const statusInfo = ORDER_STATUS_MAP[order.status] ?? ORDER_STATUS_MAP.PENDING
                      const typeInfo = ORDER_TYPE_MAP[order.type] ?? ORDER_TYPE_MAP.DINE_IN
                      const isUpdating = updatingOrderId === order.id
                      const isReady = order.status === 'READY'

                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.3 }}
                          layout
                        >
            <Card
              className={`border overflow-hidden transition-all duration-200 ${
                isReady
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-border/50 bg-card'
              }`}
              dir="rtl"
            >
              <div className={`h-1 ${isReady ? 'bg-gradient-to-l from-green-500 to-green-400/40' : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/40'}`} />
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isReady ? 'bg-green-500/10' : 'bg-[#D4AF37]/10'}`}>
                      <span className={`text-sm font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>
                        #{order.orderNumber}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusInfo.bg}`}>
                          <span className={statusInfo.color}>{statusInfo.label}</span>
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${typeInfo.color}`}>
                          {typeInfo.icon}{typeInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {order.tableNumber && (
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px] gap-1">
                      <Utensils className="h-2.5 w-2.5" />طاولة {order.tableNumber}
                    </Badge>
                  )}
                </div>

                {/* Customer */}
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>{order.customerName}</span>
                    {order.customerPhone && (
                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone className="h-3 w-3" />{order.customerPhone}
                      </span>
                    )}
                    {order.deliveryAddress && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />{order.deliveryAddress}
                      </span>
                    )}
                  </div>
                  {order.status === 'CANCELLED' && order.cancelledBy && (
                    <div className="text-[10px] text-red-300">
                      ملغي بواسطة: {order.cancelledBy}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  {order.items.slice(0, 3).map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold flex-shrink-0">
                          {item.quantity}
                        </span>
                        <span className="truncate">{item.mealTitleAr || item.mealTitle}</span>
                      </div>
                      <span className="text-muted-foreground flex-shrink-0 mr-2">
                        {(item.price * item.quantity).toFixed(2)} ج.م
                      </span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      +{order.items.length - 3} أصناف أخرى
                    </p>
                  )}
                  {order.notes && (
                    <p className="text-[10px] text-amber-400 border border-amber-500/20 rounded p-1">
                      ⚠️ {order.notes}
                    </p>
                  )}
                </div>

                <Separator className="bg-border/20" />

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">الإجمالي</p>
                    <p className={`text-lg font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>
                      {order.total.toFixed(2)} ج.م
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline"
                      onClick={() => printOrder(order)}
                      className="gap-1 border-slate-500/30 text-slate-400 hover:bg-slate-500/10 h-8 px-3 text-xs font-bold">
                      <Download className="h-3 w-3" /> طباعة
                    </Button>
                    {order.status === 'PENDING' && (
                      <Button size="sm"
                        onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                        disabled={isUpdating}
                        className="gap-1 bg-green-600 text-white hover:bg-green-700 h-8 px-3 text-xs font-bold">
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        تأكيد
                      </Button>
                    )}
                    {order.status === 'CONFIRMED' && (
                      <Button size="sm"
                        onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                        disabled={isUpdating}
                        className="gap-1 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 h-8 px-3 text-xs font-bold">
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Flame className="h-3 w-3" />}
                        تحضير
                      </Button>
                    )}
                    {order.status === 'PREPARING' && (
                      <Button size="sm"
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        disabled={isUpdating}
                        className="gap-1 bg-blue-600 text-white hover:bg-blue-700 h-8 px-3 text-xs font-bold">
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                        جاهز
                      </Button>
                    )}
                    {order.status === 'READY' && (
                      <Button size="sm"
                        onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                        disabled={isUpdating}
                        className="gap-1 bg-green-600 text-white hover:bg-green-500 h-8 px-3 text-xs font-bold">
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />}
                        تسليم
                      </Button>
                    )}
                    {order.status === 'READY_TO_PAY' && (
                      <Button size="sm"
                        onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                        disabled={isUpdating}
                        className="gap-1 bg-emerald-600 text-white hover:bg-emerald-500 h-8 px-3 text-xs font-bold">
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />}
                        دفع
                      </Button>
                    )}
                    {order.status !== 'CANCELLED' && (
                      <Button size="sm" variant="outline"
                        onClick={() => setCancelTarget(order)}
                        disabled={isUpdating}
                        className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 px-3">
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}

              {cancelledOrders.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">الطلبات الملغية</h3>
                      <p className="text-xs text-muted-foreground">تظهر هنا الطلبات التي تم إلغاؤها من قبل الأدمن مع اسم المستخدم.</p>
                    </div>
                    <Badge variant="outline" className="text-red-400 border-red-500/30">
                      {cancelledOrders.length} ملغي
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {cancelledOrders.map((order) => (
                      <Card key={order.id} className="border-red-500/20 bg-red-500/5">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">طلب #{order.orderNumber}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">{ORDER_TYPE_MAP[order.type].label} • {ORDER_STATUS_MAP[order.status].label}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-400">{order.total.toFixed(2)} ج.م</p>
                              <p className="text-[11px] text-muted-foreground">{formatTime(order.updatedAt)}</p>
                            </div>
                          </div>
                          <div className="mt-3 text-[12px] text-muted-foreground">
                            <p>الزبون: {order.customerName || 'غير محدد'}</p>
                            {order.customerPhone && <p>الهاتف: {order.customerPhone}</p>}
                            {order.tableNumber && <p>طاولة: {order.tableNumber}</p>}
                            {order.cancelledBy && <p className="text-red-300">ملغي بواسطة: {order.cancelledBy}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              Tab 5: Kitchen Display
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="kitchen">
            <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4 overflow-y-auto' : ''}`}>
              {/* Kitchen Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
                    <ChefHat className="h-5 w-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#D4AF37]">شاشة المطبخ</h2>
                    <p className="text-xs text-muted-foreground">الطلبات النشطة: {kitchenOrders.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={fetchKitchenOrders} className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                    <RefreshCw className="h-3.5 w-3.5" />
                    تحديث
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleFullscreen} className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                    {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                    {isFullscreen ? 'خروج' : 'شاشة كاملة'}
                  </Button>
                </div>
              </div>

              {/* New order flash */}
              <AnimatePresence>
                {kitchenFlash && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-center text-green-400 font-bold"
                  >
                    🔔 طلب جديد وصل!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Kitchen Orders Grid */}
              {loadingKitchen ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
                </div>
              ) : kitchenOrders.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <ChefHat className="mx-auto mb-3 h-16 w-16 opacity-20" />
                  <p className="text-lg">لا توجد طلبات نشطة</p>
                  <p className="text-sm mt-1">المطبخ جاهز لاستقبال الطلبات</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {kitchenOrders.map((order) => {
                      const typeInfo = ORDER_TYPE_MAP[order.type] ?? ORDER_TYPE_MAP.DINE_IN
                      const elapsedMins = getElapsedMinutes(order.createdAt)
                      const urgencyBorder = getUrgencyClasses(order.createdAt)
                      const urgencyColor = getUrgencyTextColor(order.createdAt)
                      const isUpdating = updatingOrderId === order.id

                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          layout
                        >
                          <Card className={`border-2 ${urgencyBorder} bg-card overflow-hidden`}>
                            <CardContent className="p-5" dir="rtl">
                              {/* Order Number - Very Large */}
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-3xl font-black text-[#D4AF37]">#{order.orderNumber}</span>
                                <Badge variant="outline" className={`gap-1.5 text-sm ${typeInfo.color} border-current/30`}>
                                  {typeInfo.icon}
                                  {typeInfo.label}
                                </Badge>
                              </div>

                              {/* Table Number - Prominent for DINE_IN */}
                              {order.type === 'DINE_IN' && order.tableNumber && (
                                <div className="mb-3 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                                  <p className="text-xs text-blue-300 mb-1">طاولة</p>
                                  <p className="text-4xl font-black text-blue-400">{order.tableNumber}</p>
                                </div>
                              )}

                              {/* Customer info */}
                              <div className="mb-3 flex items-center gap-2 text-sm">
                                <span className="font-semibold">{order.customerName}</span>
                                {order.type === 'DELIVERY' && order.deliveryAddress && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    {order.deliveryAddress}
                                  </span>
                                )}
                              </div>

                              {/* Items - Large Text */}
                              <div className="rounded-lg bg-muted/30 p-3 mb-3">
                                {order.items.map((item, idx) => (
                                  <div key={item.id ?? idx} className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-3">
                                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-base font-black text-[#D4AF37]">
                                        {item.quantity}
                                      </span>
                                      <span className="text-base font-semibold">{item.mealTitleAr || item.mealTitle}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">{(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                                {order.notes && (
                                  <div className="mt-2 rounded-md bg-amber-500/5 border border-amber-500/20 p-2 text-xs text-amber-300">
                                    ⚠️ {order.notes}
                                  </div>
                                )}
                              </div>

                              {/* Time Elapsed */}
                              <div className="flex items-center justify-center gap-2 mb-4">
                                <AlertTriangle className={`h-4 w-4 ${urgencyColor}`} />
                                <span className={`text-sm font-bold ${urgencyColor}`}>
                                  {elapsedMins > 15 && 'متأخر! '}
                                  {relativeTimers[order.id] ?? getRelativeTime(order.createdAt)}
                                </span>
                              </div>

                              {/* Status Buttons - Large, Touch-Friendly */}
                              <div className="flex flex-col gap-2">
                                {order.status === 'PENDING' && (
                                  <Button
                                    onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                                    disabled={isUpdating}
                                    className="w-full gap-2 bg-green-600 text-white hover:bg-green-700 h-12 text-base font-bold"
                                  >
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    تأكيد الطلب
                                  </Button>
                                )}
                                {order.status === 'CONFIRMED' && (
                                  <Button
                                    onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                                    disabled={isUpdating}
                                    className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] h-12 text-base font-bold"
                                  >
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                                    بدء التحضير
                                  </Button>
                                )}
                                {order.status === 'PREPARING' && (
                                  <Button
                                    onClick={() => updateOrderStatus(order.id, 'READY')}
                                    disabled={isUpdating}
                                    className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 h-12 text-base font-bold"
                                  >
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                    جاهز!
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Auto-refresh indicator */}
              <div className="text-center text-xs text-muted-foreground py-2">
                <Timer className="h-3 w-3 inline-block ml-1" />
                يتم التحديث تلقائياً كل 15 ثانية
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              Tab: Shift Management
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="shift">
            <ShiftManagement adminUsername={typeof window !== 'undefined' ? sessionStorage.getItem('saraya-staff-username') || 'admin' : 'admin'} />
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              Tab: Staff Management
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="staff">
            <StaffManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          Dialogs
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Edit Meal Dialog */}
      <Dialog open={!!editingMeal} onOpenChange={(open) => { if (!open) setEditingMeal(null) }}>
        <DialogContent className="bg-card border-border/50 max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37] flex items-center gap-2"><Edit3 className="h-5 w-5" /> تعديل الطبق</DialogTitle>
            <DialogDescription className="text-muted-foreground">{editingMeal?.titleAr || editingMeal?.title}</DialogDescription>
          </DialogHeader>
          {editingMeal && (
            <div className="space-y-5 py-2">
              <ImageUpload value={editImageUrl} onChange={(url) => setEditImageUrl(url)} label="صورة الطبق" aspect="wide" placeholder="اضغط لتغيير الصورة" />
              <div className="space-y-2">
                <Label className="text-sm font-medium">السعر (ر.س)</Label>
                <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="bg-muted border-border/50" step="0.01" dir="ltr" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingMeal(null)} className="border-border/50">إلغاء</Button>
            <Button onClick={handleUpdateMeal} disabled={savingId !== null} className="gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431]">
              {savingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add-ons Management Dialog */}
      <Dialog open={!!addonsMeal} onOpenChange={(open) => { if (!open) setAddonsMeal(null) }}>
        <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-orange-400 flex items-center gap-2">
              <Package className="h-5 w-5" />
              إضافات: {addonsMeal?.titleAr || addonsMeal?.title}
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
                    <Input value={newAddon.titleAr} onChange={(e) => setNewAddon({ ...newAddon, titleAr: e.target.value })} placeholder="صلصة ثوم" className="bg-muted border-border/50 h-9" dir="rtl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Add-on Name (English)</Label>
                    <Input value={newAddon.title} onChange={(e) => setNewAddon({ ...newAddon, title: e.target.value })} placeholder="Garlic Sauce" className="bg-muted border-border/50 h-9" dir="ltr" />
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">السعر (ر.س) *</Label>
                    <Input type="number" value={newAddon.price} onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value })} placeholder="10" className="bg-muted border-border/50 h-9" step="0.01" dir="ltr" />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <Switch checked={newAddon.isRecommended} onCheckedChange={(v) => setNewAddon({ ...newAddon, isRecommended: v })} />
                    <Label className="text-xs flex items-center gap-1">
                      <Star className="h-3 w-3 text-orange-400" />
                      توصية الشيف
                    </Label>
                  </div>
                </div>
                <Button onClick={handleCreateAddon} disabled={creatingAddon || !newAddon.title || !newAddon.price} className="w-full gap-2 bg-orange-500 text-white hover:bg-orange-600 h-9">
                  {creatingAddon ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  إضافة
                </Button>
              </CardContent>
            </Card>

            {/* Existing add-ons list */}
            {loadingAddons ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" /></div>
            ) : addons.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Package className="mx-auto mb-2 h-10 w-10 opacity-20" />
                <p className="text-sm">لا توجد إضافات لهذا الطبق بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-muted-foreground">الإضافات الحالية ({addons.length})</h4>
                {addons.map((addon) => (
                  <div key={addon.id} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${addon.isRecommended ? 'border-orange-500/30 bg-orange-500/5' : 'border-border/30 bg-muted/20'} ${!addon.isActive ? 'opacity-50' : ''}`}>
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
                    <span className="text-sm font-bold text-[#D4AF37]">{addon.price.toFixed(2)} ر.س</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleToggleAddonRecommended(addon)} className={`h-7 w-7 p-0 ${addon.isRecommended ? 'text-orange-400' : 'text-muted-foreground'}`}>
                        <Star className={`h-3.5 w-3.5 ${addon.isRecommended ? 'fill-orange-400' : ''}`} />
                      </Button>
                      <Switch checked={addon.isActive} onCheckedChange={() => handleToggleAddonActive(addon)} className="scale-75" />
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ type: 'addon', id: addon.id, name: addon.titleAr || addon.title })} className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-card border-border/50" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2"><Trash2 className="h-5 w-5" /> تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              هل أنت متأكد من حذف &quot;{deleteTarget?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="border-border/50">إلغاء</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteTarget?.type === 'meal') handleDeleteMeal(deleteTarget.id)
              else if (deleteTarget?.type === 'promotion') handleDeletePromo(deleteTarget.id)
              else if (deleteTarget?.type === 'addon') handleDeleteAddon(deleteTarget.id)
            }} className="gap-2">
              <Trash2 className="h-4 w-4" /> حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="bg-card border-border/50" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              تأكيد إلغاء الطلب
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              هل أنت متأكد من إلغاء الطلب رقم #{cancelTarget?.orderNumber}؟
              سيتم تحويله إلى ملغي وسيُحذف من الإيراد.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)} className="border-border/50">تراجع</Button>
            <Button variant="destructive" onClick={() => {
              if (cancelTarget) {
                updateOrderStatus(cancelTarget.id, 'CANCELLED')
                setCancelTarget(null)
              }
            }} className="gap-2">
              <X className="h-4 w-4" /> إلغاء الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Shift Management Sub-Component ───────────────────────────────────────────

interface Shift {
  id: string
  startedAt: string
  endedAt?: string
  startedBy: string
  endedBy: string
  totalRevenue: number
  totalExpenses: number
  netRevenue: number
  status: string
  notes: string
}

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  createdAt: string
  addedBy: string
}

function ShiftManagement({ adminUsername }: { adminUsername: string }) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [pastShifts, setPastShifts] = useState<Shift[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [shiftOrders, setShiftOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [closingShift, setClosingShift] = useState(false)
  const [shiftNotes, setShiftNotes] = useState('')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [shiftRes, shiftsRes] = await Promise.all([
        fetch('/api/shifts?current=true'),
        fetch('/api/shifts'),
      ])
      if (shiftRes.ok) {
        const shift = await shiftRes.json()
        setCurrentShift(shift)
        if (shift) {
          const [expRes, ordRes] = await Promise.all([
            fetch(`/api/expenses?shiftId=${shift.id}`),
            fetch(`/api/orders?shiftId=${shift.id}&status=DELIVERED`),
          ])
          if (expRes.ok) setExpenses(await expRes.json())
          if (ordRes.ok) setShiftOrders(await ordRes.json())
        }
      }
      if (shiftsRes.ok) {
        const all = await shiftsRes.json()
        setPastShifts(all.filter((s: Shift) => s.status === 'CLOSED'))
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const startNewShift = async () => {
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startedBy: adminUsername }),
      })
      if (res.ok) {
        toast({ title: 'تم بدء شيفت جديد' })
        fetchData()
      }
    } catch { /* ignore */ }
  }

  const closeShift = async () => {
    if (!currentShift) return
    setClosingShift(true)
    try {
      // Export CSV + clear cashier/day data on backend
      const res = await fetch(`/api/shifts/${currentShift.id}/export-and-clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endedBy: adminUsername,
          notes: shiftNotes,
          includeNonDelivered: true,
        }),
      })

      if (res.ok) {
        const data = await res.json().catch(() => null)
        // Download CSV in browser
        if (data?.csv) {
          const blob = new Blob(['\uFEFF' + data.csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          const safeShiftId = String(currentShift.id).slice(0, 8)
          link.download = `shift-${safeShiftId}-today.csv`
          link.click()
          URL.revokeObjectURL(url)
        }

        toast({ title: 'تم إغلاق الشيفت', description: 'تم تصدير التقرير بنجاح وتم الاحتفاظ ببيانات الشيفت' })
        setShowCloseConfirm(false)
        fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: err?.error || 'فشل تصدير الشيفت أو الحذف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setClosingShift(false)
    }
  }

  const downloadExcel = (shift: Shift) => {
    const rows = [
      ['تقرير الشيفت - سرايا العرب'],
      [''],
      ['معلومات الشيفت'],
      ['البداية', new Date(shift.startedAt).toLocaleString('ar-EG')],
      ['النهاية', shift.endedAt ? new Date(shift.endedAt).toLocaleString('ar-EG') : '-'],
      ['بدأ بواسطة', shift.startedBy],
      ['أُنهي بواسطة', shift.endedBy],
      [''],
      ['الإيرادات'],
      ['إجمالي الإيرادات', shift.totalRevenue.toFixed(2) + ' ج.م'],
      ['إجمالي المصروفات', shift.totalExpenses.toFixed(2) + ' ج.م'],
      ['صافي الإيرادات', shift.netRevenue.toFixed(2) + ' ج.م'],
      [''],
      ['المصروفات التفصيلية'],
      ['الاسم', 'المبلغ', 'الفئة', 'التاريخ'],
    ]

    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `shift-${shift.id.slice(0, 8)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const deliveredOrders = shiftOrders.filter(o => o.status === 'DELIVERED')
  const totalRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>

  return (
    <div className="space-y-6" dir="rtl">
      {/* Current Shift Card */}
      {currentShift ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-400 flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                الشيفت الحالي — مفتوح
              </CardTitle>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">نشط</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'الإيرادات', value: `${totalRevenue.toFixed(2)} ج.م`, color: 'text-[#D4AF37]' },
                { label: 'المصروفات', value: `${totalExpenses.toFixed(2)} ج.م`, color: 'text-red-400' },
                { label: 'صافي الإيراد', value: `${(totalRevenue - totalExpenses).toFixed(2)} ج.م`, color: totalRevenue - totalExpenses >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'طلبات مكتملة', value: deliveredOrders.length, color: 'text-blue-400' },
              ].map((s, i) => (
                <Card key={i} className="border-border/40 bg-card">
                  <CardContent className="p-3">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              بدأ: {new Date(currentShift.startedAt).toLocaleString('ar-EG')} — بواسطة {currentShift.startedBy}
            </div>
            <Button onClick={() => setShowCloseConfirm(true)}
              className="gap-2 bg-red-600 text-white hover:bg-red-500 font-bold">
              <StopCircle className="h-4 w-4" />إنهاء الشيفت وتسليم الإيراد
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/40 bg-card">
          <CardContent className="p-6 text-center space-y-4">
            <StopCircle className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">لا يوجد شيفت مفتوح حالياً</p>
            <Button onClick={startNewShift} className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
              <PlayCircle className="h-4 w-4" />بدء شيفت جديد
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Past Shifts */}
      {pastShifts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground">الشيفتات السابقة</h3>
          {pastShifts.map(shift => (
            <Card key={shift.id} className="border-border/40 bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-medium">{new Date(shift.startedAt).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(shift.startedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} —
                      {shift.endedAt ? new Date(shift.endedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {' | '}{shift.startedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#D4AF37]">{shift.totalRevenue.toFixed(0)} ج.م</p>
                      <p className="text-[10px] text-muted-foreground">إيراد</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-red-400">{shift.totalExpenses.toFixed(0)} ج.م</p>
                      <p className="text-[10px] text-muted-foreground">مصروفات</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-bold ${shift.netRevenue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{shift.netRevenue.toFixed(0)} ج.م</p>
                      <p className="text-[10px] text-muted-foreground">صافي</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadExcel(shift)}
                      className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                      <Download className="h-3.5 w-3.5" />CSV
                    </Button>
                  </div>
                </div>
                {shift.notes && <p className="text-xs text-muted-foreground mt-2 border-t border-border/30 pt-2">ملاحظات: {shift.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Close Shift Dialog */}
      {showCloseConfirm && (
        <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
          <DialogContent className="bg-card border-border/50" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <StopCircle className="h-5 w-5" />إنهاء الشيفت
              </DialogTitle>
              <DialogDescription>
                سيتم تسجيل الإيرادات والمصروفات وإغلاق الشيفت الحالي.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-lg font-bold text-[#D4AF37]">{totalRevenue.toFixed(0)} ج.م</p>
                  <p className="text-xs text-muted-foreground">إيراد</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-lg font-bold text-red-400">{totalExpenses.toFixed(0)} ج.م</p>
                  <p className="text-xs text-muted-foreground">مصروفات</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className={`text-lg font-bold ${totalRevenue - totalExpenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(totalRevenue - totalExpenses).toFixed(0)} ج.م</p>
                  <p className="text-xs text-muted-foreground">صافي</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات (اختياري)</Label>
                <textarea
                  className="w-full rounded-lg border border-border/50 bg-muted/50 p-3 text-sm resize-none text-right"
                  rows={3}
                  placeholder="أي ملاحظات عن الشيفت..."
                  value={shiftNotes}
                  onChange={e => setShiftNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowCloseConfirm(false)} className="border-border/50">إلغاء</Button>
              <Button onClick={closeShift} disabled={closingShift} className="gap-2 bg-red-600 text-white hover:bg-red-500 font-bold">
                {closingShift ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                إنهاء الشيفت
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ── Staff Management Sub-Component ───────────────────────────────────────────

interface StaffMember {
  id: string
  username: string
  role: string
  createdAt: string
}

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'أدمن', color: 'text-[#D4AF37]' },
  CASHIER: { label: 'كاشير', color: 'text-blue-400' },
  KITCHEN: { label: 'مطبخ', color: 'text-orange-400' },
  WAITER: { label: 'ويتر', color: 'text-purple-400' },
}

function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('CASHIER')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const { toast } = useToast()

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staff')
      if (res.ok) setStaff(await res.json())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const addStaff = async () => {
    if (!newUsername || !newPassword) return
    setSaving(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      })
      if (res.ok) {
        toast({ title: 'تم إضافة الموظف', description: `${newUsername} — ${ROLE_MAP[newRole]?.label}` })
        setNewUsername(''); setNewPassword(''); setNewRole('CASHIER')
        setShowAdd(false); fetchStaff()
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' })
      }
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const updateStaff = async (id: string) => {
    setSaving(true)
    try {
      const body: Record<string, string> = {}
      if (editRole) body.role = editRole
      if (editPassword) body.password = editPassword
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: 'تم التحديث' })
        setEditingId(null); setEditRole(''); setEditPassword('')
        fetchStaff()
      }
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const deleteStaff = async (id: string, username: string) => {
    if (!confirm(`هل تريد حذف ${username}؟`)) return
    try {
      await fetch(`/api/staff/${id}`, { method: 'DELETE' })
      toast({ title: 'تم الحذف' })
      fetchStaff()
    } catch { /* ignore */ }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#D4AF37] flex items-center gap-2">
          <Users className="h-5 w-5" />إدارة الموظفين ({staff.length})
        </h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}
          className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
          <UserPlus className="h-4 w-4" />إضافة موظف
        </Button>
      </div>

      {/* Add Staff Form */}
      {showAdd && (
        <Card className="border-[#D4AF37]/30 bg-[#D4AF37]/5">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-bold text-[#D4AF37] flex items-center gap-2"><UserPlus className="h-4 w-4" />موظف جديد</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">اسم المستخدم</Label>
                <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="cashier1" className="bg-muted/50 border-border/50" dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">كلمة المرور</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••" className="bg-muted/50 border-border/50" dir="ltr" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الصلاحية</Label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-muted/50 p-2 text-sm text-right">
                <option value="CASHIER">كاشير</option>
                <option value="KITCHEN">مطبخ</option>
                <option value="WAITER">ويتر</option>
                <option value="ADMIN">أدمن</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={addStaff} disabled={saving || !newUsername || !newPassword}
                className="flex-1 gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}حفظ
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-muted-foreground">إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      <div className="space-y-2">
        {staff.map(member => (
          <Card key={member.id} className="border-border/40 bg-card">
            <CardContent className="p-4">
              {editingId === member.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">تغيير الصلاحية</Label>
                      <select value={editRole || member.role} onChange={e => setEditRole(e.target.value)}
                        className="w-full rounded-lg border border-border/50 bg-muted/50 p-2 text-sm text-right">
                        <option value="CASHIER">كاشير</option>
                        <option value="KITCHEN">مطبخ</option>
                        <option value="WAITER">ويتر</option>
                        <option value="ADMIN">أدمن</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">كلمة مرور جديدة (اختياري)</Label>
                      <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="اتركه فارغاً لعدم التغيير" className="bg-muted/50 border-border/50 h-9" dir="ltr" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStaff(member.id)} disabled={saving}
                      className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}حفظ
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditRole(''); setEditPassword('') }} className="text-muted-foreground">إلغاء</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium" dir="ltr">{member.username}</p>
                      <span className={`text-xs font-bold ${ROLE_MAP[member.role]?.color || 'text-muted-foreground'}`}>
                        {ROLE_MAP[member.role]?.label || member.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(member.id); setEditRole(member.role) }}
                      className="gap-1.5 border-border/50 text-muted-foreground hover:text-[#D4AF37] h-8">
                      <KeyRound className="h-3.5 w-3.5" />تعديل
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteStaff(member.id, member.username)}
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}