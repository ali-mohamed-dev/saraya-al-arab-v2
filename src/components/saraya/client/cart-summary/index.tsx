'use client'

import { useState, useMemo } from 'react'
import { useCartStore } from '@/store/cart-store'
import { CartStep, OrderType, TableInfoType, OrderSummaryType } from './types'
import { CartItemsList } from './cart-items-list'
import { OrderTypeSelector } from './order-type-selector'
import { TableInfoForm } from './table-info-form'
import { OrderSummary } from './order-summary'
import { OrderSuccess } from './order-success'
import { ArrowRight, ArrowLeft, ShoppingCart, X, User, Phone, MapPin, StickyNote } from 'lucide-react'
import { SERVICE_CHARGE_RATE } from '@/lib/saraya/constants'

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

  const summary: OrderSummaryType = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const addOnsTotal = item.addOns?.reduce((aSum, a) => aSum + a.price, 0) || 0
      return sum + (item.price + addOnsTotal) * item.quantity
    }, 0)
    
    const tax = subtotal * SERVICE_CHARGE_RATE
    const discount = 0
    const total = subtotal + tax - discount
    return { subtotal, tax, discount, total }
  }, [items])

  const canProceedToConfirm = () => {
    if (items.length === 0) return false
    if (!orderType) return false
    if (orderType === 'dine-in' && (!tableInfo.tableNumber || !tableInfo.isValid)) return false
    if ((orderType === 'takeaway' || orderType === 'delivery') && !customerPhone) return false
    if (orderType === 'delivery' && !deliveryAddress) return false
    return true
  }

  const submitOrder = async () => {
    if (!canProceedToConfirm()) return
    setSubmitting(true)
    try {
      const orderData = {
        type: orderType?.toUpperCase().replace('-', '_'), // تحويل dine-in إلى DINE_IN لتتوافق مع الداتابيز
        tableNumber: orderType === 'dine-in' ? tableInfo.tableNumber : null,
        tableCode: orderType === 'dine-in' ? tableInfo.tableCode : null,
        customerName: customerName.trim() || 'عميل خارجي',
        customerPhone: customerPhone.trim(),
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
        serviceCharge: summary.tax,
        total: summary.total,
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
        }
        clearCart()
        setStep('success')
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.message || data.error || 'حدث خطأ في إرسال الطلب')
      }
    } catch (err) {
      console.error('Submit order error:', err)
      alert('حدث خطأ في الاتصال، حاول مرة أخرى')
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