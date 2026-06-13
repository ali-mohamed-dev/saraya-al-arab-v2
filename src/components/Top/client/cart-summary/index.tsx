'use client'

import { useState, useMemo, useEffect } from 'react'
import { useCartStore } from '@/store/cart-store'
import { CartStep, OrderType, TableInfoType, OrderSummaryType } from './types'
import { CartItemsList } from './cart-items-list'
import { OrderTypeSelector } from './order-type-selector'
import { TableInfoForm } from './table-info-form'
import { OrderSummary } from './order-summary'
import { OrderSuccess } from './order-success'
import { ArrowRight, ArrowLeft, ShoppingCart, X, User, Phone, MapPin, StickyNote, Gift } from 'lucide-react'
import { SERVICE_CHARGE_RATE, DELIVERY_FEE } from '@/lib/saraya/constants'
import { toast } from 'sonner'

function getAddOnKey(addOns: { id: string }[]): string {
  if (!addOns || addOns.length === 0) return ''
  return addOns.map((a) => a.id).sort().join(',')
}

interface CartSummaryProps {
  onClose?: () => void
}

export function CartSummary({ onClose }: CartSummaryProps) {
  const { items, updateQuantity, removeItem, clearCart } = useCartStore()
  const [step, setStep] = useState<CartStep>('cart')
  const [orderType, setOrderType] = useState<OrderType>(null)
  const [tableInfo, setTableInfo] = useState<TableInfoType>({
    tableNumber: '',
    tableCode: '',
    isValid: false,
  })
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Logged-in web user
  const [webUser, setWebUser] = useState<{ id: string; email: string; name: string; phone?: string } | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; label: string; address: string }[]>([])
  // Points
  const [pointsBalance, setPointsBalance] = useState(0)
  const [pointsValue, setPointsValue] = useState(0.10)
  const [usePoints, setUsePoints] = useState(false)
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false)

  // ─── Auto-fill بيانات العميل من الحساب المسجل ───
  useEffect(() => {
    const raw = sessionStorage.getItem('web-user-data')
    if (raw) {
      try {
        const u = JSON.parse(raw)
        setWebUser({ id: u.id, email: u.email, name: u.name, phone: u.phone })
        if (u.phone) setCustomerPhone(u.phone)
        if (u.name) setCustomerName(u.name)
        // Load saved addresses
        fetch(`/api/addresses?userId=${u.id}`).then(r => r.ok && r.json()).then(data => {
          if (Array.isArray(data)) setSavedAddresses(data)
        }).catch((err) => console.warn('Failed to load addresses:', err))
        // Fetch points balance + loyalty settings
        fetch(`/api/web-users/${u.id}`).then(r => r.ok ? r.json() : null).then(data => {
          if (data?.pointsBalance !== undefined) setPointsBalance(data.pointsBalance)
        }).catch((err) => console.warn('Failed to load points:', err))
        fetch('/api/settings/loyalty').then(r => r.ok ? r.json() : null).then(data => {
          if (data) {
            setLoyaltyEnabled(data.loyaltyEnabled || false)
            if (data.loyaltyCashback) setPointsValue(data.loyaltyCashback)
          }
        }).catch((err) => console.warn('Failed to load loyalty settings:', err))
      } catch (err) { console.warn('User data processing error:', err) }
    }
  }, [])

  // ─── Auto-fill table info from localStorage + active order ───
  // لو البراوزر عمل أوردر قبل كده على نفس الطاولة والطلب لسه شغال
  // نعمل auto-fill و auto-verify لكود الطاولة
  useEffect(() => {
    if (orderType !== 'dine-in') return

    const savedTableNum = localStorage.getItem('saraya-table-number')
    const savedTableCode = localStorage.getItem('saraya-table-code')
    const activeOrderId = localStorage.getItem('saraya-active-order-id')

    // لو فيه بيانات طاولة محفوظة من QR أو أوردر سابق
    if (savedTableNum && savedTableCode) {
      setTableInfo(prev => ({
        ...prev,
        tableNumber: savedTableNum,
        tableCode: savedTableCode.toUpperCase(),
      }))

      // لو فيه أوردر نشط، نتأكد إنه على نفس الطاولة ونعمل auto-verify
      if (activeOrderId) {
        const autoVerify = async () => {
          try {
            // نتأكد إن الأوردر النشط على نفس الطاولة
            const orderRes = await fetch(`/api/orders/${activeOrderId}`)
            if (orderRes.ok) {
              const order = await orderRes.json()
              if (order.tableNumber === savedTableNum && !['DELIVERED', 'CANCELLED'].includes(order.status)) {
                // الأوردر نشط على نفس الطاولة → نعمل verify تلقائي
                const verifyRes = await fetch('/api/tables/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tableNumber: savedTableNum, code: savedTableCode.toUpperCase() }),
                })
                const verifyData = await verifyRes.json()
                if (verifyRes.ok && verifyData.valid) {
                  setTableInfo(prev => ({ ...prev, isValid: true }))
                }
              }
            }
          } catch (err) {
            console.warn('Auto-verify (active order) failed:', err)
          }
        }
        autoVerify()
      } else {
        // مفيش أوردر نشط بس البيانات محفوظة → نعمل verify عادي
        const autoVerify = async () => {
          try {
            const verifyRes = await fetch('/api/tables/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tableNumber: savedTableNum, code: savedTableCode.toUpperCase() }),
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.valid) {
              setTableInfo(prev => ({ ...prev, isValid: true }))
            }
          } catch (err) {
            console.warn('Auto-verify (saved data) failed:', err)
          }
        }
        autoVerify()
      }
    }
  }, [orderType])

  const summary: OrderSummaryType = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const addOnsTotal = item.addOns?.reduce((aSum, a) => aSum + a.price, 0) || 0
      return sum + (item.price + addOnsTotal) * item.quantity
    }, 0)
    
    const serviceCharge = orderType === 'dine-in' ? subtotal * SERVICE_CHARGE_RATE : 0
    const deliveryFee = orderType === 'delivery' ? DELIVERY_FEE : 0
    const pointsDiscount = usePoints && loyaltyEnabled && pointsBalance > 0
      ? Math.min(pointsBalance * pointsValue, subtotal + serviceCharge + deliveryFee)
      : 0
    const total = subtotal + serviceCharge + deliveryFee - pointsDiscount
    return { subtotal, serviceCharge, deliveryFee, discount: pointsDiscount, total }
  }, [items, orderType, usePoints, loyaltyEnabled, pointsBalance, pointsValue])

  const canProceedToConfirm = () => {
    if (items.length === 0) return false
    if (!orderType) return false
    if (orderType === 'dine-in' && (!tableInfo.tableNumber || !tableInfo.isValid)) return false
    if ((orderType === 'takeaway' || orderType === 'delivery') && !customerPhone) return false
    if (orderType === 'delivery' && !deliveryAddress) return false
    return true
  }

  const submitOrder = async () => {
    // تحقق من الحد الأدنى للطلب (قبل الخصم)
    if (summary.subtotal + summary.serviceCharge + summary.deliveryFee < 20) {
      toast.error('الحد الأدنى للطلب 20 ج.م')
      return
    }
    if (!canProceedToConfirm()) return
    setSubmitting(true)
    try {
      const orderData = {
        type: ({ 'dine-in': 'DINE_IN', 'takeaway': 'TAKEAWAY', 'delivery': 'DELIVERY' } as Record<string, string>)[orderType!] || orderType?.toUpperCase(),
        tableNumber: orderType === 'dine-in' ? tableInfo.tableNumber : null,
        tableCode: orderType === 'dine-in' ? tableInfo.tableCode : null,
        customerName: customerName.trim() || 'عميل خارجي',
        customerPhone: customerPhone.trim(),
        customerEmail: webUser?.email || undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : null,
        items: items.map((item) => ({
          mealId: item.mealId,
          mealTitle: item.title,
          mealTitleAr: item.titleAr,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          price: item.price,
          addOns: item.addOns,
          category: item.category || '',
          preparationArea: item.preparationArea || (item.category === 'مشروبات' ? 'BARISTA' : 'KITCHEN'),
        })),
        notes: notes.trim() || null,
        subtotal: summary.subtotal,
        serviceCharge: summary.serviceCharge,
        deliveryFee: summary.deliveryFee,
        total: summary.total,
        redeemPoints: usePoints && loyaltyEnabled && pointsBalance > 0 ? Math.min(Math.ceil(summary.discount / pointsValue), pointsBalance) : 0,
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      if (res.ok) {
        const result = await res.json().catch(() => ({}))
        if (result.id) {
          localStorage.setItem('saraya-active-order-id', result.id)
          if (orderData.customerPhone) {
            localStorage.setItem('saraya-customer-phone', orderData.customerPhone)
          }
          if (customerName.trim() && customerName.trim() !== 'عميل خارجي') {
            localStorage.setItem('saraya-customer-name', customerName.trim())
          }
          if (orderType === 'delivery' && deliveryAddress.trim()) {
            localStorage.setItem('saraya-delivery-address', deliveryAddress.trim())
          }
          // حفظ بيانات الطاولة في localStorage عشان المرات الجاية
          if (orderType === 'dine-in' && tableInfo.tableNumber && tableInfo.tableCode) {
            localStorage.setItem('saraya-table-number', tableInfo.tableNumber)
            localStorage.setItem('saraya-table-code', tableInfo.tableCode.toUpperCase())
          }
        }
        clearCart()
        setStep('success')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message || data.error || 'حدث خطأ في إرسال الطلب')
      }
    } catch (err) {
      console.error('Submit order error:', err)
      toast.error('حدث خطأ في الاتصال، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  const goHome = () => {
    setStep('cart')
    setOrderType(null)
    setCustomerName('')
    setCustomerPhone('')
    setDeliveryAddress('')
    setNotes('')
    setTableInfo({ tableNumber: '', tableCode: '', isValid: false })
    onClose?.()
  }

  if (step === 'success') {
    return <OrderSuccess onGoHome={goHome} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b pb-3 mb-4">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-lg">
          {step === 'cart' && 'سلة المشتريات'}
          {step === 'order-type' && 'نوع الطلب'}
          {step === 'confirm' && 'مراجعة الطلب'}
        </h2>
        {items.length > 0 && step === 'cart' && (
          <span className="mr-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {items.reduce((sum, i) => sum + i.quantity, 0)} صنف
          </span>
        )}
        {/* زرار إغلاق السلة */}
        {onClose && (
          <button onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {step === 'cart' && (
          <CartItemsList items={items} onUpdateQuantity={updateQuantity} onRemoveItem={removeItem} />
        )}
        {step === 'order-type' && (
          <div className="space-y-6">
            <OrderTypeSelector selectedType={orderType} onSelectType={setOrderType} />
            {orderType === 'dine-in' && (
              <div className="space-y-4">
                <TableInfoForm tableInfo={tableInfo} onUpdate={(info) => setTableInfo((prev) => ({ ...prev, ...info }))} />
              </div>
            )}
            {(orderType === 'takeaway' || orderType === 'delivery') && (
              <div className="space-y-4 rounded-xl border bg-card p-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary" /> الاسم (اختياري)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="أدخل اسمك"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-primary" /> رقم الهاتف *
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="01xxxxxxxxx"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    dir="ltr"
                  />
                </div>
                {orderType === 'delivery' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" /> عنوان التوصيل *
                    </label>
                    {savedAddresses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {savedAddresses.map(addr => (
                          <button key={addr.id} type="button" onClick={() => setDeliveryAddress(addr.address)}
                            className={`text-xs rounded-lg border px-2.5 py-1.5 transition-all ${
                              deliveryAddress === addr.address
                                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                                : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-[#D4AF37]/30'
                            }`}>
                            {addr.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="أدخل العنوان بالتفصيل..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors min-h-[80px]"
                    />
                  </div>
                )}
              </div>
            )}
            {/* حقل الملاحظات يظهر دائماً عند اختيار أي نوع طلب */}
            {orderType && (
              <div className="space-y-1.5 p-4 rounded-xl border bg-card">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <StickyNote className="h-4 w-4" /> ملاحظات إضافية
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات خاصة بالطلب (اختياري)..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors min-h-[60px]"
                />
              </div>
            )}
          </div>
        )}
        {step === 'confirm' && (
          <div className="space-y-6">
            <OrderSummary items={items} summary={summary} />
            {/* Points redemption */}
            {webUser && loyaltyEnabled && pointsBalance > 0 && (
              <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-sm font-medium">نقاط الولاء</span>
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{pointsBalance} نقطة</span>
                  </div>
                  <button onClick={() => setUsePoints(!usePoints)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${usePoints ? 'bg-[#D4AF37]' : 'bg-input'}`}>
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${usePoints ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                  </button>
                </div>
                {usePoints && (
                  <div className="text-xs text-muted-foreground border-t border-[#D4AF37]/10 pt-2">
                    خصم: <span className="font-bold text-[#D4AF37]">{summary.discount.toFixed(2)} ج.م</span>
                    {' • '}سيتم خصم {Math.ceil(summary.discount / pointsValue)} نقطة من رصيدك
                  </div>
                )}
              </div>
            )}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h4 className="font-semibold text-sm">تفاصيل الطلب</h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">نوع الطلب</span>
                <span className="font-medium">
                  {orderType === 'dine-in' && 'تناول في المطعم'}
                  {orderType === 'takeaway' && 'أخذ بعيداً'}
                  {orderType === 'delivery' && 'توصيل للمنزل'}
                </span>
              </div>
              {orderType === 'dine-in' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">رقم الطاولة</span>
                  <span className="font-medium">{tableInfo.tableNumber}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">رقم الهاتف</span>
                  <span className="font-medium">{customerPhone}</span>
                </div>
              )}
              {orderType === 'delivery' && deliveryAddress && (
                <div className="flex flex-col gap-1 text-sm border-t pt-2 mt-2">
                  <span className="text-muted-foreground">عنوان التوصيل</span>
                  <span className="font-medium leading-relaxed">{deliveryAddress}</span>
                </div>
              )}
              {notes && (
                <div className="flex flex-col gap-1 text-sm border-t pt-2 mt-2">
                  <span className="text-muted-foreground">الملاحظات</span>
                  <span className="font-medium text-primary">{notes}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-4 mt-4 space-y-2">
        {step === 'order-type' && (
          <button onClick={() => setStep('confirm')} disabled={!canProceedToConfirm()} className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            مراجعة وتأكيد الطلب
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {step === 'confirm' && (
          <button onClick={submitOrder} disabled={submitting} className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        )}
        {step === 'cart' && items.length > 0 && (
          <button onClick={() => setStep('order-type')} className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
            متابعة الطلب
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {step === 'cart' && items.length === 0 && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37]/8 border border-[#D4AF37]/15 px-4 py-2 text-xs font-medium text-[#D4AF37]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]/50" />
              اختر من القائمة لبدء الطلب
            </div>
          </div>
        )}
        {step !== 'cart' && (
          <button onClick={() => { if (step === 'confirm') setStep('order-type'); else if (step === 'order-type') setStep('cart') }} className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            <ArrowRight className="h-4 w-4" />
            رجوع
          </button>
        )}
      </div>
    </div>
  )
}
