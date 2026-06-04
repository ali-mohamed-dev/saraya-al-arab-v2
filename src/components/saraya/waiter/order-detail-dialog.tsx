'use client'

import { useEffect, useState, Dispatch, SetStateAction, useMemo, useCallback } from 'react'
import Image from 'next/image' // Import Image from next/image
import {
  Eye, Check, Loader2, UtensilsCrossed
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { ORDER_STATUS_MAP, ORDER_TYPE_MAP, SERVICE_CHARGE_RATE } from '@/lib/saraya/constants'
import { getRelativeTime, isValidEgyptianPhone, transformOrder } from '@/lib/saraya/helpers'
import { useToast } from '@/hooks/use-toast'
import type { Meal, Order, OrderItem } from '@/lib/saraya/types'

interface OrderDetailDialogProps {
  selectedOrder: Order | null
  setSelectedOrder: Dispatch<SetStateAction<Order | null>>
  meals: Meal[]
  updatingOrderId: string | null
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<void>
  onOrdersUpdated: (updatedOrder: Order) => void
}

export function OrderDetailDialog({
  selectedOrder,
  setSelectedOrder,
  meals,
  updatingOrderId,
  updateOrderStatus,
  onOrdersUpdated,
}: OrderDetailDialogProps) {
  const { toast } = useToast()

  // State للتعديل المحلي لتجنب مشكلة Source of Truth
  const [editableOrder, setEditableOrder] = useState<Order | null>(null)
  const [editableOrderItems, setEditableOrderItems] = useState<OrderItem[] | null>(null)
  const [removedOrderItemIds, setRemovedOrderItemIds] = useState<string[]>([])
  const [savingOrderEdits, setSavingOrderEdits] = useState(false)

  // تحسين البحث عن الوجبات لتصبح O(1)
  const mealsMap = useMemo(() => {
    const map = new Map<string, Meal>()
    meals.forEach(m => map.set(m.id, m))
    return map
  }, [meals])

  // حساب الإجماليات بشكل آمن وتلقائي
  const totals = useMemo(() => {
    const items = editableOrderItems || selectedOrder?.items || []
    const subtotal = items.reduce((sum, item) => { // Ensure add-ons are included in subtotal calculation
      // Ensure addOns is an array before reducing
      // The type definition for OrderItem.addOns is already correct: { title: string; titleAr: string; price: number }[]
      // So, item.addOns?.reduce is safe.
      const addOnsPrice = item.addOns?.reduce((aSum, a) => aSum + a.price, 0) || 0
      return sum + (item.price + addOnsPrice) * item.quantity
    }, 0)
    const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE * 100) / 100
    const total = subtotal + serviceCharge
    return { subtotal, serviceCharge, total }
  }, [editableOrderItems, selectedOrder])

  useEffect(() => {
    if (selectedOrder) {
      setEditableOrder(structuredClone(selectedOrder))
      setEditableOrderItems(structuredClone(selectedOrder.items))
      setRemovedOrderItemIds([])
    } else {
      setEditableOrder(null)
      setEditableOrderItems(null)
      setRemovedOrderItemIds([])
    }
  }, [selectedOrder])

  const handleEditItemQuantity = (itemId: string, delta: number) => {
    setEditableOrderItems((prev) => {
      if (!prev) return prev
      const item = prev.find(i => i.id === itemId)
      if (!item) return prev

      const nextQuantity = item.quantity + delta
      if (nextQuantity <= 0) { // If quantity becomes 0 or less, mark for removal
        setRemovedOrderItemIds(ids => [...new Set([...ids, itemId])])
        return prev.filter(i => i.id !== itemId)
      }

      return prev.map(i => i.id === itemId ? { ...i, quantity: nextQuantity } : i)
    })
  }

  const handleChangeOrderItemMeal = useCallback((itemId: string, mealId: string) => {
    const meal = mealsMap.get(mealId)
    if (!meal) return
    setEditableOrderItems((prev) =>
      prev
        ? prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  mealId: meal.id,
                  mealTitle: meal.title,
                  mealTitleAr: meal.titleAr,
                  price: meal.price,
                  category: meal.category,
                  imageUrl: meal.imageUrl,
                  addOns: [],
                }
              : item
          )
        : prev
    )
  }, [mealsMap])

  const handleRemoveOrderItem = useCallback((itemId: string) => {
    setEditableOrderItems((prev) => prev?.filter((item) => item.id !== itemId) ?? null)
    setRemovedOrderItemIds((ids) => [...new Set([...ids, itemId])])
  }, [])

  const handleSaveOrderEdits = async () => {
    if (!selectedOrder || !editableOrder || !editableOrderItems) return

    // منع حفظ طلب فارغ
    if (editableOrderItems.length === 0) {
      toast({ title: 'طلب فارغ', description: 'لا يمكن حفظ طلب بدون أصناف. قم بإلغاء الطلب بدلاً من ذلك.', variant: 'destructive' })
      return
    }

    setSavingOrderEdits(true)
    try {
      if (editableOrder.type !== 'DINE_IN' && !isValidEgyptianPhone(editableOrder.customerPhone)) {
        toast({ title: 'رقم هاتف غير صالح', description: 'يرجى تصحيح رقم الهاتف قبل الحفظ', variant: 'destructive' })
        setSavingOrderEdits(false)
        return
      }

      const requestBody: Record<string, unknown> = {
        customerName: editableOrder.customerName,
        customerPhone: editableOrder.customerPhone,
        tableNumber: editableOrder.tableNumber, // tableNumber is string | undefined in Order interface
        notes: editableOrder.notes,
        total: totals.total,
        subtotal: totals.subtotal,
        serviceCharge: totals.serviceCharge,
      }

      if (editableOrder.status === 'PENDING') {
        requestBody.itemUpdates = editableOrderItems.map((item) => ({
          id: item.id,
          mealId: item.mealId,
          mealTitle: item.mealTitle,
          mealTitleAr: item.mealTitleAr,
          price: item.price,
          quantity: item.quantity,
          addOns: item.addOns || [],
          category: item.category || '',
          imageUrl: item.imageUrl || '',
        }))
        requestBody.removedItemIds = removedOrderItemIds
      }

      const response = await fetch(`/api/orders/${editableOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'فشل في حفظ التعديلات')
      }

      const updatedOrder = transformOrder(await response.json())
      if (updatedOrder) { // Ensure updatedOrder is not null
        setEditableOrder(structuredClone(updatedOrder))
        setEditableOrderItems(structuredClone(updatedOrder.items))
        setSelectedOrder(updatedOrder)
        onOrdersUpdated(updatedOrder)
        toast({ title: 'تم حفظ التعديلات', description: `تم تحديث طلب رقم #${updatedOrder.orderNumber}` })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ'
      toast({ title: 'خطأ', description: message, variant: 'destructive' })
    } finally {
      setSavingOrderEdits(false)
    }
  }

  const open = !!selectedOrder // Dialog open state is derived from selectedOrder
  const handleDialogChange = (open: boolean) => { // Renamed to avoid conflict with prop
    if (!open) setSelectedOrder(null)
  }

  if (!selectedOrder) return null

  const displayOrder = editableOrder || selectedOrder // Use editableOrder for display if available
  const displayItems = editableOrderItems || selectedOrder.items // Use editableOrderItems for display if available
  const activeMeals = meals.filter((m) => m.isActive)

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-lg max-h-[calc(100vh-4rem)] overflow-hidden" dir="rtl">
        <div className="flex flex-col h-full max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37] flex items-center gap-2">
              <Eye className="h-5 w-5" />
              طلب #{selectedOrder.orderNumber}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              تفاصيل الطلب
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-5 py-4">
            {/* Order meta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">الحالة</p>
                <Badge className={`mt-1 ${ORDER_STATUS_MAP[selectedOrder.status]?.bg} ${ORDER_STATUS_MAP[selectedOrder.status]?.color} border`}>
                  {ORDER_STATUS_MAP[selectedOrder.status]?.label}
                </Badge>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">النوع</p>
                <p className={`mt-1 text-sm font-semibold ${ORDER_TYPE_MAP[selectedOrder.type]?.color}`}>
                  {ORDER_TYPE_MAP[selectedOrder.type]?.label}
                </p>
              </div>
              {selectedOrder.type === 'DINE_IN' && (
                <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">رقم الطاولة</p>
                  {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' ? (
                    <Input
                      type="number"
                      value={displayOrder.tableNumber ?? ''} // Use displayOrder
                      min="1"
                      onChange={(e) => setEditableOrder((prev) => prev ? { ...prev, tableNumber: e.target.value || undefined } : prev)} // Fix: use undefined instead of null
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-[#D4AF37]">{displayOrder.tableNumber}</p>
                  )}
                </div>
              )}
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">الوقت</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {getRelativeTime(displayOrder.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                <Label className="text-xs text-muted-foreground">اسم العميل</Label>
                <Input
                  value={displayOrder.customerName}
                  onChange={(e) => setEditableOrder((prev) => prev ? { ...prev, customerName: e.target.value } : prev)}
                  disabled={displayOrder.status === 'DELIVERED' || displayOrder.status === 'CANCELLED'}
                  className="mt-1"
                />
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                <Label className="text-xs text-muted-foreground">رقم الهاتف</Label>
                <Input
                  type="tel"
                  value={displayOrder.customerPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 11)
                    setEditableOrder((prev) => prev ? { ...prev, customerPhone: val } : prev)
                  }}
                  disabled={displayOrder.status === 'DELIVERED' || displayOrder.status === 'CANCELLED'}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-sm font-semibold text-[#D4AF37] mb-2">الأصناف</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {displayItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border/30 bg-muted/10 p-2.5"
                  >
                    <div className="flex items-start gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl} // Keep img for now, Image from next/image requires specific setup
                          alt=""
                          className="h-10 w-12 rounded-lg object-cover border border-[#D4AF37]/20 flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-muted border border-border/30 shrink-0">
                          <UtensilsCrossed className="h-3 w-3 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        {displayOrder.status === 'PENDING' ? ( // Use displayOrder
                          <Select
                            value={item.mealId}
                            onValueChange={(val) => handleChangeOrderItemMeal(item.id, val)}
                          >
                            <SelectTrigger className="w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activeMeals.map((meal) => (
                                <SelectItem key={meal.id} value={meal.id}>
                                  {meal.titleAr || meal.title} — {meal.price.toFixed(2)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-semibold truncate">{item.mealTitleAr || item.mealTitle}</p>
                        )}

                        {displayOrder.status === 'PENDING' ? ( // Use displayOrder
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="secondary" onClick={() => handleEditItemQuantity(item.id, -1)}>-</Button>
                              <span className="text-sm font-semibold">{item.quantity}</span>
                              <Button size="sm" variant="secondary" onClick={() => handleEditItemQuantity(item.id, 1)}>+</Button>
                            </div>
                            <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleRemoveOrderItem(item.id)}>
                              حذف
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {item.price.toFixed(2)} ج.م
                          </p>
                        )}

                        {Array.isArray(item.addOns) && item.addOns.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.addOns.map((addon, idx) => (
                              <Badge
                                  key={idx}
                                variant="outline"
                                className="border-orange-500/20 text-orange-400 text-[9px] px-1.5 py-0"
                              >
                                {addon.titleAr || addon.title} (+{addon.price.toFixed(2)})
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-[#D4AF37] flex-shrink-0">
                        {((item.price + (item.addOns?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3">
              <p className="text-xs text-[#D4AF37] font-semibold mb-1">ملاحظات</p>
              <Input
                value={displayOrder.notes ?? ''} // Use displayOrder
                onChange={(e) => setEditableOrder((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
                disabled={displayOrder.status === 'DELIVERED' || displayOrder.status === 'CANCELLED'}
                placeholder="أضف ملاحظات خاصة..."
                className="bg-transparent border-none p-0 h-auto text-sm focus-visible:ring-0"
              />
            </div>

            {/* Totals */}
            <Separator className="bg-border/30" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي</span>
                <span>{totals.subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>رسوم الخدمة</span>
                <span>{totals.serviceCharge.toFixed(2)} ج.م</span>
              </div>
              <Separator className="bg-border/30" />
              <div className="flex justify-between font-bold text-[#D4AF37] text-base">
                <span>الإجمالي</span>
                <span>{totals.total.toFixed(2)} ج.م</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 space-y-3 pb-8">
              {displayOrder.status !== 'DELIVERED' && displayOrder.status !== 'CANCELLED' && (
                <Button onClick={handleSaveOrderEdits} disabled={savingOrderEdits}
                  className="w-full bg-blue-600 text-white hover:bg-blue-500 gap-2 font-bold">
                  {savingOrderEdits ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  حفظ التعديلات
                </Button>
              )}
              {displayOrder.type === 'DINE_IN' && displayOrder.status === 'READY' && displayItems.length > 0 && ( // Ensure not empty
                <Button onClick={() => { updateOrderStatus(displayOrder.id, 'READY_TO_PAY'); setSelectedOrder(null); }}
                  disabled={updatingOrderId === displayOrder.id}
                  className="w-full bg-green-600 text-white hover:bg-green-500 gap-2 font-bold">
                  {updatingOrderId === displayOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  إغلاق الطاولة وإرسال للكاشير
                </Button>
              )}
              {displayOrder.status === 'PENDING' && displayOrder.type === 'DINE_IN' && displayItems.length > 0 && ( // Ensure not empty
                <Button onClick={() => { updateOrderStatus(displayOrder.id, 'CONFIRMED'); setSelectedOrder(null); }}
                  disabled={updatingOrderId === displayOrder.id || savingOrderEdits}
                  className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 gap-2 font-bold">
                  {updatingOrderId === displayOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  تأكيد الطلب
                </Button>
              )}
            </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
