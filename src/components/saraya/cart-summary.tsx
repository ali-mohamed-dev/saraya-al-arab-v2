'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ShoppingCart, Minus, Plus, Trash2, Send,
  UtensilsCrossed, ShoppingBag, Truck, MapPin,
  Phone, User, Clock, CheckCircle, Loader2,
  ArrowRight, ArrowLeft, ChefHat, Receipt
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCartStore } from '@/store/cart-store'
import { toast } from 'sonner'

type OrderType = 'dine-in' | 'takeaway' | 'delivery' | null
type StepType = 'cart' | 'order-type' | 'confirm' | 'success'

function getAddOnKey(addOns: { id: string }[]): string {
  if (!addOns || addOns.length === 0) return ''
  return addOns.map((a) => a.id).sort().join(',')
}

export function CartSummary() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<StepType>('cart')
  const [orderType, setOrderType] = useState<OrderType>(null)
  const [tableNumber, setTableNumber] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)

  // No socket.io needed - admin polls for new orders

  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const getTotalItems = useCartStore((s) => s.getTotalItems)
  const getTotalPrice = useCartStore((s) => s.getTotalPrice)

  const totalItems = hasMounted ? getTotalItems() : 0
  // getTotalPrice already includes 12% service charge
  // For takeaway/delivery: subtotal = price without service charge
  // For dine-in: totalPrice = subtotal + 12%
  const rawTotal = hasMounted
    ? items.reduce((sum, item) => {
        const addOnTotal = item.addOns?.reduce((s, a) => s + a.price, 0) || 0
        return sum + (item.price + addOnTotal) * item.quantity
      }, 0)
    : 0
  const subtotal = rawTotal
  const serviceCharge = subtotal * 0.12
  const totalPriceWithService = subtotal + serviceCharge

  // No socket.io needed for Vercel - admin panel polls for new orders

  const resetOrderInfo = useCallback(() => {
    setOrderType(null)
    setTableNumber('')
    setPickupTime('')
    setCustomerName('')
    setCustomerPhone('')
    setDeliveryAddress('')
    setNotes('')
    setStep('cart')
    setOrderNumber(null)
    setOrderId(null)
    setIsSubmitting(false)
  }, [])

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const isValidEgyptianPhone = (phone: string) => {
    const regex = /^01[0125][0-9]{8}$/
    return regex.test(phone)
  }

  const canProceedToConfirm = () => {
    if (!orderType) return false
    if (orderType === 'dine-in' && !tableNumber) return false
    if (orderType === 'takeaway') return isValidEgyptianPhone(customerPhone)
    if (orderType === 'delivery') return deliveryAddress.length > 5 && isValidEgyptianPhone(customerPhone)
    return orderType === 'dine-in'
  }

  const handleSubmitOrder = async () => {
    if (items.length === 0) return

    if (orderType !== 'dine-in' && !isValidEgyptianPhone(customerPhone)) {
      toast.error('رقم الهاتف غير صالح', {
        description: 'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 01).',
      })
      return
    }

    if (!canProceedToConfirm()) return

    setIsSubmitting(true)

    try {
      // التحقق من حالة الشيفت قبل إرسال الطلب لضمان تواجد موظفين لاستلامه
      const shiftCheckRes = await fetch('/api/shifts?current=true')
      const currentShift = shiftCheckRes.ok ? await shiftCheckRes.json() : null

      if (!currentShift) {
        toast.error('المطعم غير متاح حالياً', {
          description: 'نعتذر، لا يمكن استقبال طلبات في الوقت الحالي لعدم وجود شيفت عمل مفتوح.',
        })
        setIsSubmitting(false)
        return
      }

      const isDineIn = orderType === 'dine-in'
      const finalTotal = isDineIn ? totalPriceWithService : subtotal
      const finalServiceCharge = isDineIn ? serviceCharge : 0

      const orderPayload = {
        type: orderType === 'dine-in' ? 'DINE_IN' : orderType === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY',
        customerName,
        customerPhone,
        deliveryAddress,
        tableNumber,
        pickupTime,
        notes,
        shiftId: currentShift.id,
        items: items.map((item) => ({
          mealId: item.mealId,
          mealTitle: item.title,
          mealTitleAr: item.titleAr,
          price: item.price + (item.addOns?.reduce((s, a) => s + a.price, 0) || 0),
          quantity: item.quantity,
          addOns: JSON.stringify(item.addOns || []),
          imageUrl: item.imageUrl,
        })),
        subtotal,
        serviceCharge: finalServiceCharge,
        total: finalTotal,
        kitchenAccess: false, // يتم تفعيله بعد مراجعة الموظف المختص
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'فشل في إرسال الطلب')
      }

      const orderData = await response.json()

      // Order created - admin panel will detect it via polling

      // Set success state
      setOrderNumber(orderData.orderNumber)
      setOrderId(orderData.id)
      setStep('success')

      // Clear cart and reset after showing success
      clearCart()

      toast.success('تم إرسال طلبك بنجاح!', {
        description: `رقم الطلب: #${orderData.orderNumber}`,
      })
    } catch (error) {
      console.error('Order submission error:', error)
      toast.error('فشل في إرسال الطلب', {
        description: error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEstimatedTime = () => {
    switch (orderType) {
      case 'dine-in': return '15-25 دقيقة'
      case 'takeaway': return '20-30 دقيقة'
      case 'delivery': return '30-45 دقيقة'
      default: return '15-30 دقيقة'
    }
  }

  const getOrderTypeLabel = () => {
    switch (orderType) {
      case 'dine-in': return 'صالة'
      case 'takeaway': return 'تيكاوي'
      case 'delivery': return 'ديليفري'
      default: return ''
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) resetOrderInfo()
      }}
    >
      {/* Floating Cart Button */}
      <SheetTrigger asChild>
        <button
          className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95"
          style={{ backgroundColor: '#D4AF37' }}
          aria-label="فتح ملخص الطلب"
        >
          <ShoppingCart className="h-6 w-6 text-black" />
          {hasMounted && totalItems > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
              {totalItems}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex h-full w-full flex-col border-[#D4AF37]/20 bg-[#1A1A1A] text-white sm:max-w-md"
      >
        <SheetHeader className="border-b border-[#D4AF37]/20 pb-4">
          <SheetTitle className="flex items-center gap-3 text-xl font-bold text-[#D4AF37]">
            {step === 'cart' && <ShoppingCart className="h-5 w-5" />}
            {step === 'order-type' && <Receipt className="h-5 w-5" />}
            {step === 'confirm' && <ChefHat className="h-5 w-5" />}
            {step === 'success' && <CheckCircle className="h-5 w-5" />}
            {step === 'cart' && 'ملخص الطلب'}
            {step === 'order-type' && 'تفاصيل الطلب'}
            {step === 'confirm' && 'تأكيد الطلب'}
            {step === 'success' && 'تم بنجاح!'}
          </SheetTitle>
          {/* Step indicator */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 pt-1">
              {(['cart', 'order-type', 'confirm'] as StepType[]).map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-2"
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      step === s
                        ? 'bg-[#D4AF37] text-black'
                        : (['cart', 'order-type', 'confirm'] as StepType[]).indexOf(step) > i
                          ? 'bg-green-600 text-white'
                          : 'bg-[#333] text-gray-500'
                    }`}
                  >
                    {(['cart', 'order-type', 'confirm'] as StepType[]).indexOf(step) > i ? '✓' : i + 1}
                  </div>
                  {i < 2 && (
                    <div className={`h-0.5 w-6 ${(['cart', 'order-type', 'confirm'] as StepType[]).indexOf(step) > i ? 'bg-green-600' : 'bg-[#333]'}`} />
                  )}
                </div>
              ))}
            </div>
          )}
          {hasMounted && items.length > 0 && step === 'cart' && (
            <p className="text-sm text-gray-400">
              {totalItems} {totalItems === 1 ? 'عنصر' : totalItems === 2 ? 'عنصران' : 'عناصر'}
            </p>
          )}
        </SheetHeader>

        {/* ===== STEP 1: Cart Items ===== */}
        {step === 'cart' && items.length > 0 && (
          <>
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="space-y-3 p-4">
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((item) => {
                    const addOnKey = getAddOnKey(item.addOns)
                    const addOnTotal = item.addOns?.reduce((s, a) => s + a.price, 0) || 0
                    const unitPrice = item.price + addOnTotal
                    return (
                      <motion.div
                        key={`${item.mealId}-${addOnKey}`}
                        layout
                        initial={{ opacity: 0, x: -30, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -30, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="rounded-xl border border-[#D4AF37]/10 bg-[#222222] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {item.imageUrl && (
                              <div className="mb-2 h-16 w-16 overflow-hidden rounded-lg">
                                <img
                                  src={item.imageUrl}
                                  alt={item.titleAr}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <h3 className="truncate text-sm font-semibold text-white">{item.titleAr}</h3>
                            {item.addOns && item.addOns.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.addOns.map((addon) => (
                                  <span
                                    key={addon.id}
                                    className="inline-flex items-center rounded-md bg-[#D4AF37]/10 px-1.5 py-0.5 text-[10px] text-[#D4AF37]"
                                  >
                                    + {addon.titleAr}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="mt-1 text-xs text-gray-400">
                              {unitPrice.toFixed(2)} جنيه لكل عنصر
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.mealId, addOnKey)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10"
                            aria-label={`حذف ${item.titleAr}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.mealId, addOnKey, item.quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-black transition-transform hover:scale-110 active:scale-95"
                              style={{ backgroundColor: '#D4AF37' }}
                              aria-label="تقليل الكمية"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="flex h-7 w-9 items-center justify-center rounded-md bg-[#333333] text-sm font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.mealId, addOnKey, item.quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-black transition-transform hover:scale-110 active:scale-95"
                              style={{ backgroundColor: '#D4AF37' }}
                              aria-label="زيادة الكمية"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-[#D4AF37]">
                            {(unitPrice * item.quantity).toFixed(2)} جنيه
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>

            <SheetFooter className="border-t border-[#D4AF37]/20 pt-4">
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>إجمالي العناصر</span>
                  <span className="font-medium text-white">{totalItems}</span>
                </div>
                <Separator className="bg-[#D4AF37]/10" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-200">المجموع</span>
                  <span className="text-2xl font-extrabold text-[#D4AF37]">
                    {subtotal.toFixed(2)} جنيه
                  </span>
                </div>
              </div>
              <div className="mt-4 w-full space-y-2">
                <Button
                  className="w-full gap-2 py-5 text-base font-bold text-black hover:bg-[#c9a430]"
                  style={{ backgroundColor: '#D4AF37' }}
                  onClick={() => setStep('order-type')}
                >
                  <Send className="h-4 w-4" />
                  متابعة الطلب
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-red-500/30 py-4 text-red-400 hover:bg-red-500/10"
                  onClick={() => {
                    clearCart()
                    toast.info('تم مسح السلة')
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  مسح الكل
                </Button>
              </div>
            </SheetFooter>
          </>
        )}

        {/* Empty cart state */}
        {step === 'cart' && items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(212,175,55,0.1)' }}
            >
              <ShoppingCart className="h-10 w-10 text-[#D4AF37]" />
            </div>
            <p className="text-lg font-semibold text-gray-300">السلة فارغة</p>
            <p className="text-center text-sm text-gray-500">لم تقم بإضافة أي عناصر بعد</p>
          </div>
        )}

        {/* ===== STEP 2: Order Type Selection ===== */}
        {step === 'order-type' && (
          <div className="flex flex-1 flex-col overflow-y-auto" dir="rtl">
            <div className="flex-1 space-y-4 p-4">
              {/* Order Type Selection */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'dine-in' as OrderType, icon: UtensilsCrossed, label: 'صالة', desc: 'خدمة داخل المطعم' },
                  { type: 'takeaway' as OrderType, icon: ShoppingBag, label: 'تيكاوي', desc: 'استلام من المطعم' },
                  { type: 'delivery' as OrderType, icon: Truck, label: 'ديليفري', desc: 'توصيل للمنزل' },
                ].map(({ type, icon: Icon, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 ${
                      orderType === type
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                        : 'border-white/10 bg-[#222] text-gray-400 hover:border-[#D4AF37]/30'
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                    <span className="text-sm font-bold">{label}</span>
                    <span className="text-[9px] text-center leading-tight opacity-70">{desc}</span>
                  </button>
                ))}
              </div>

              {/* Dine-in: Table Number + Service Charge */}
              {orderType === 'dine-in' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm text-gray-300">
                      <UtensilsCrossed className="h-4 w-4 text-[#D4AF37]" />
                      رقم الطاولة *
                    </Label>
                    <Input
                      type="number"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="مثال: 5"
                      className="h-14 bg-[#222] text-center text-xl font-bold text-white border-white/10 focus:border-[#D4AF37]/50"
                      min="1"
                      max="30"
                    />
                  </div>
                  {/* Service charge breakdown */}
                  <div className="space-y-1.5 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3">
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>المجموع</span>
                      <span>{subtotal.toFixed(2)} جنيه</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#D4AF37]">
                      <span>رسوم الخدمة (12%)</span>
                      <span>+ {serviceCharge.toFixed(2)} جنيه</span>
                    </div>
                    <Separator className="bg-[#D4AF37]/20" />
                    <div className="flex justify-between font-bold text-white">
                      <span>الإجمالي</span>
                      <span>{totalPriceWithService.toFixed(2)} جنيه</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Takeaway Fields */}
              {orderType === 'takeaway' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm text-gray-300">
                      <User className="h-4 w-4 text-[#D4AF37]" />
                      الاسم (اختياري)
                    </Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="اسمك"
                      className="border-white/10 bg-[#222] text-white focus:border-[#D4AF37]/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="h-4 w-4 text-[#D4AF37]" />
                      رقم الهاتف *
                    </Label>
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setCustomerPhone(val);
                      }}
                      placeholder="01xxxxxxxxx"
                      className="border-white/10 bg-[#222] text-white focus:border-[#D4AF37]/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm text-gray-300">
                      <Clock className="h-4 w-4 text-[#D4AF37]" />
                      وقت الاستلام (اختياري)
                    </Label>
                    <Input
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      placeholder="مثال: بعد 30 دقيقة / 3:00 م"
                      className="border-white/10 bg-[#222] text-white focus:border-[#D4AF37]/50"
                    />
                  </div>
                  <div className="flex justify-between rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3 font-bold text-white">
                    <span>الإجمالي</span>
                    <span>{subtotal.toFixed(2)} جنيه</span>
                  </div>
                </motion.div>
              )}

              {/* Delivery Fields */}
              {orderType === 'delivery' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm text-gray-300">
                      <User className="h-4 w-4 text-[#D4AF37]" />
                      الاسم (اختياري)
                    </Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="اسمك"
                      className="border-white/10 bg-[#222] text-white focus:border-[#D4AF37]/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="h-4 w-4 text-[#D4AF37]" />
                      رقم الهاتف *
                    </Label>
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setCustomerPhone(val);
                      }}
                      placeholder="01xxxxxxxxx"
                      className="border-white/10 bg-[#222] text-white focus:border-[#D4AF37]/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm text-gray-300">
                      <MapPin className="h-4 w-4 text-[#D4AF37]" />
                      العنوان *
                    </Label>
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="العنوان بالتفصيل"
                      className="border-white/10 bg-[#222] text-white focus:border-[#D4AF37]/50"
                    />
                  </div>
                  <div className="flex justify-between rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3 font-bold text-white">
                    <span>الإجمالي</span>
                    <span>{subtotal.toFixed(2)} جنيه</span>
                  </div>
                </motion.div>
              )}

              {/* Notes field - shown for all order types */}
              {orderType && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="space-y-2"
                >
                  <Label className="flex items-center gap-2 text-sm text-gray-300">
                    ملاحظات (اختياري)
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية..."
                    className="border-white/10 bg-[#222] text-white resize-none focus:border-[#D4AF37]/50"
                    rows={2}
                  />
                </motion.div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="space-y-2 border-t border-[#D4AF37]/20 p-4">
              <Button
                className="w-full gap-2 py-5 text-base font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] hover:bg-[#c9a430]"
                style={{ backgroundColor: canProceedToConfirm() ? '#D4AF37' : '#555' }}
                onClick={() => setStep('confirm')}
                disabled={!canProceedToConfirm()}
              >
                <ArrowLeft className="h-4 w-4" />
                مراجعة وتأكيد الطلب
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 border-white/10 text-gray-400 hover:bg-white/5"
                onClick={() => setStep('cart')}
              >
                <ArrowRight className="h-4 w-4" />
                رجوع للسلة
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Confirm Order ===== */}
        {step === 'confirm' && (
          <div className="flex flex-1 flex-col overflow-y-auto" dir="rtl">
            <div className="flex-1 space-y-4 p-4">
              {/* Order type badge */}
              <div className="flex items-center gap-2 rounded-lg bg-[#D4AF37]/10 p-3">
                {orderType === 'dine-in' && <UtensilsCrossed className="h-5 w-5 text-[#D4AF37]" />}
                {orderType === 'takeaway' && <ShoppingBag className="h-5 w-5 text-[#D4AF37]" />}
                {orderType === 'delivery' && <Truck className="h-5 w-5 text-[#D4AF37]" />}
                <span className="text-sm font-bold text-[#D4AF37]">
                  طلب {getOrderTypeLabel()}
                </span>
              </div>

              {/* Order details based on type */}
              {orderType === 'dine-in' && tableNumber && (
                <div className="rounded-lg bg-[#222] p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <UtensilsCrossed className="h-4 w-4 text-[#D4AF37]" />
                    <span>طاولة رقم: <strong className="text-white">{tableNumber}</strong></span>
                  </div>
                </div>
              )}

              {orderType === 'takeaway' && (
                <div className="space-y-2 rounded-lg bg-[#222] p-3">
                  {customerName && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <User className="h-4 w-4 text-[#D4AF37]" />
                      <span>الاسم: <strong className="text-white">{customerName}</strong></span>
                    </div>
                  )}
                  {customerPhone && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="h-4 w-4 text-[#D4AF37]" />
                      <span>الهاتف: <strong className="text-white" dir="ltr">{customerPhone}</strong></span>
                    </div>
                  )}
                  {pickupTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Clock className="h-4 w-4 text-[#D4AF37]" />
                      <span>وقت الاستلام: <strong className="text-white">{pickupTime}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="space-y-2 rounded-lg bg-[#222] p-3">
                  {customerName && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <User className="h-4 w-4 text-[#D4AF37]" />
                      <span>الاسم: <strong className="text-white">{customerName}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Phone className="h-4 w-4 text-[#D4AF37]" />
                    <span>الهاتف: <strong className="text-white">{customerPhone}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <MapPin className="h-4 w-4 text-[#D4AF37]" />
                    <span>العنوان: <strong className="text-white">{deliveryAddress}</strong></span>
                  </div>
                </div>
              )}

              {notes && (
                <div className="rounded-lg bg-[#222] p-3">
                  <p className="text-sm text-gray-300">
                    <span className="text-[#D4AF37]">ملاحظات:</span> {notes}
                  </p>
                </div>
              )}

              {/* Items summary */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-300">الأصناف ({totalItems})</h3>
                <div className="space-y-2">
                  {items.map((item) => {
                    const addOnTotal = item.addOns?.reduce((s, a) => s + a.price, 0) || 0
                    const unitPrice = item.price + addOnTotal
                    return (
                      <div
                        key={`${item.mealId}-${getAddOnKey(item.addOns)}`}
                        className="flex items-center justify-between rounded-lg bg-[#222] p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{item.titleAr}</p>
                          {item.addOns && item.addOns.length > 0 && (
                            <p className="text-xs text-gray-400">
                              + {item.addOns.map((a) => a.titleAr).join('، ')}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            {item.quantity} × {unitPrice.toFixed(2)} جنيه
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-[#D4AF37]">
                          {(unitPrice * item.quantity).toFixed(2)} جنيه
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Price breakdown */}
              <div className="space-y-2 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4">
                <div className="flex justify-between text-sm text-gray-300">
                  <span>المجموع الفرعي</span>
                  <span>{subtotal.toFixed(2)} جنيه</span>
                </div>
                {orderType === 'dine-in' && (
                  <div className="flex justify-between text-sm text-[#D4AF37]">
                    <span>رسوم الخدمة (12%)</span>
                    <span>+ {serviceCharge.toFixed(2)} جنيه</span>
                  </div>
                )}
                <Separator className="bg-[#D4AF37]/20" />
                <div className="flex justify-between text-lg font-extrabold text-white">
                  <span>الإجمالي</span>
                  <span className="text-[#D4AF37]">
                    {(orderType === 'dine-in' ? totalPriceWithService : subtotal).toFixed(2)} جنيه
                  </span>
                </div>
              </div>

              {/* Estimated time */}
              <div className="flex items-center justify-center gap-2 rounded-lg bg-[#222] p-3 text-sm text-gray-400">
                <Clock className="h-4 w-4 text-[#D4AF37]" />
                <span>الوقت المتوقع: <strong className="text-white">{getEstimatedTime()}</strong></span>
              </div>
            </div>

            {/* Submit Footer */}
            <div className="space-y-2 border-t border-[#D4AF37]/20 p-4">
              <Button
                className="w-full gap-2 py-5 text-base font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] hover:bg-[#c9a430]"
                style={{ backgroundColor: '#D4AF37' }}
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري إرسال الطلب...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    تأكيد وإرسال الطلب
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 border-white/10 text-gray-400 hover:bg-white/5"
                onClick={() => setStep('order-type')}
                disabled={isSubmitting}
              >
                <ArrowRight className="h-4 w-4" />
                رجوع لتعديل الطلب
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 4: Success ===== */}
        {step === 'success' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center" dir="rtl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-600/20">
                <CheckCircle className="h-14 w-14 text-green-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <h2 className="text-2xl font-extrabold text-white">
                تم إرسال طلبك بنجاح!
              </h2>
              <p className="text-gray-400">طلبك الآن قيد المراجعة</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full space-y-3"
            >
              {/* Order number */}
              <div className="rounded-xl border border-[#D4AF37]/30 bg-[#222] p-5">
                <p className="text-sm text-gray-400">رقم الطلب</p>
                <p className="text-4xl font-extrabold text-[#D4AF37]">
                  #{orderNumber}
                </p>
              </div>

              {/* Order details summary */}
              <div className="space-y-2 rounded-xl bg-[#222] p-4 text-sm">
                <div className="flex items-center justify-between text-gray-300">
                  <span>نوع الطلب</span>
                  <span className="font-bold text-white">{getOrderTypeLabel()}</span>
                </div>
                {orderType === 'dine-in' && tableNumber && (
                  <div className="flex items-center justify-between text-gray-300">
                    <span>الطاولة</span>
                    <span className="font-bold text-white">{tableNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-gray-300">
                  <span>الوقت المتوقع</span>
                  <span className="font-bold text-white">{getEstimatedTime()}</span>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex items-center justify-between font-bold">
                  <span className="text-gray-200">الإجمالي</span>
                  <span className="text-[#D4AF37]">
                    {(orderType === 'dine-in' ? totalPriceWithService : subtotal).toFixed(2)} جنيه
                  </span>
                </div>
              </div>

              {/* Status hint */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-center text-xs text-blue-400">
                يمكنك متابعة حالة طلبك من شاشة تتبع الطلب
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="w-full space-y-2"
            >
              <Button
                className="w-full gap-2 py-5 text-base font-bold text-black hover:bg-[#c9a430]"
                style={{ backgroundColor: '#D4AF37' }}
                onClick={() => {
                  setOpen(false)
                  resetOrderInfo()
                }}
              >
                العودة للقائمة
              </Button>
            </motion.div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
