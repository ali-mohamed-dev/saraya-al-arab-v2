'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, Clock, ChefHat, UtensilsCrossed,
  ShoppingBag, Truck, ArrowRight, Loader2, RefreshCw,
  Package, XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { playNotificationSound } from '@/lib/saraya/helpers'
import { OrderTypeIcon, getOrderTypeLabel } from '@/components/Top/shared/order-type-icon'

interface OrderData {
  id: string
  orderNumber: number
  type: string
  status: string
  kitchenStatus: string
  baristaStatus: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  tableNumber: string
  pickupTime: string
  notes: string
  subtotal: number
  serviceCharge: number
  total: number
  createdAt: string
  updatedAt: string
  items: Array<{
    id: string
    mealId: string
    mealTitle: string
    mealTitleAr: string
    price: number
    quantity: number
    addOns: any[] | string
    imageUrl: string
  }>
}

interface OrderTrackingProps {
  orderId: string
  onBackToMenu?: () => void
}

const STATUS_STEPS = [
  { key: 'PENDING', label: 'قيد الانتظار', labelEn: 'Pending', icon: Clock, estimatedMinutes: 0 },
  { key: 'CONFIRMED', label: 'تم التأكيد', labelEn: 'Confirmed', icon: CheckCircle, estimatedMinutes: 5 },
  { key: 'PREPARING', label: 'جاري التحضير', labelEn: 'Preparing', icon: ChefHat, estimatedMinutes: 15 },
  { key: 'READY', label: 'جاهز', labelEn: 'Ready', icon: Package, estimatedMinutes: 20 },
  { key: 'READY_TO_PAY', label: 'جاهز للدفع', labelEn: 'Ready to Pay', icon: CheckCircle, estimatedMinutes: 22 },
  { key: 'DELIVERED', label: 'تم التسليم', labelEn: 'Delivered', icon: CheckCircle, estimatedMinutes: 0 },
]

function getStatusIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

function getEstimatedTime(order: OrderData): string {
  const statusIdx = getStatusIndex(order.status)
  if (statusIdx >= STATUS_STEPS.length - 1) return 'تم!'
  if (statusIdx === 0) return '15-45 دقيقة'

  // Calculate remaining time based on current step
  const createdTime = new Date(order.createdAt).getTime()
  const elapsed = (Date.now() - createdTime) / 1000 / 60 // minutes

  let baseEstimate = 25 // default total estimate in minutes
  if (order.type === 'DINE_IN') baseEstimate = 20
  else if (order.type === 'TAKEAWAY') baseEstimate = 25
  else if (order.type === 'DELIVERY') baseEstimate = 40

  const remaining = Math.max(0, baseEstimate - elapsed)
  if (remaining <= 5) return 'أقل من 5 دقائق'
  if (remaining <= 10) return '5-10 دقائق'
  if (remaining <= 20) return '10-20 دقيقة'
  return '20-30 دقيقة'
}

export function OrderTracking({ orderId, onBackToMenu }: OrderTrackingProps) {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevStatusesRef = useRef<{ kitchen: string, barista: string, general: string }>({ kitchen: '', barista: '', general: '' })

  const fetchOrder = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)

    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        localStorage.removeItem('saraya-active-order-id')
        throw new Error('فشل في جلب بيانات الطلب')
      }
      const data = await response.json()

      // تنبيه الويتر عند جاهزية أي قسم
      const kitchenJustReady = prevStatusesRef.current.kitchen && prevStatusesRef.current.kitchen !== 'READY' && data.kitchenStatus === 'READY'
      const baristaJustReady = prevStatusesRef.current.barista && prevStatusesRef.current.barista !== 'READY' && data.baristaStatus === 'READY'
      const orderJustReady = prevStatusesRef.current.general && prevStatusesRef.current.general !== 'READY' && data.status === 'READY'

      if (kitchenJustReady || baristaJustReady || orderJustReady) {
        playNotificationSound()
      }

      // تحديث مراجع الحالة للمقارنة القادمة
      prevStatusesRef.current = {
        kitchen: data.kitchenStatus || '',
        barista: data.baristaStatus || '',
        general: data.status || ''
      }

      setOrder(data)
      setError(null)

      // لا نمسح الطلب إلا إذا تم تسليمه نهائياً أو إلغاؤه
      if (['READY_TO_PAY', 'DELIVERED', 'CANCELLED'].includes(data.status)) {
        localStorage.removeItem('saraya-active-order-id')
      }
    } catch (err) {
      console.error('Error fetching order:', err)
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orderId])

  // Initial fetch
  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // Auto-refresh every 8 seconds (single polling interval, no duplicates)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchOrder()
    }, 8000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchOrder])

  const currentStatusIndex = order ? getStatusIndex(order.status) : 0
  const isCancelled = order?.status === 'CANCELLED'
  // لطلبات الصالة، لا نعتبر الطلب منتهياً بمجرد طلب الحساب (READY_TO_PAY)
  const isFinished = order?.status === 'DELIVERED'

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-6" dir="rtl">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground">جاري تحميل بيانات الطلب...</p>
      </div>
    )
  }

  // Error state
  if (error || !order) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-lg font-bold text-foreground">حدث خطأ</p>
        <p className="text-sm text-muted-foreground">{error || 'لم يتم العثور على الطلب'}</p>
        <Button
          className="gap-2 bg-[#D4AF37] text-black hover:bg-[#c9a430]"
          onClick={() => fetchOrder()}
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  // إذا انتهى الطلب (تم التسليم أو الإلغاء)، نعرض رسالة "لا توجد طلبات نشطة"
  if (isFinished && !isCancelled) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20"
        >
          <CheckCircle className="h-10 w-10 text-green-500" />
        </motion.div>
        <p className="text-xl font-bold text-foreground">تم توصيل طلبك بنجاح!</p>
        <p className="text-sm text-muted-foreground">بالهناء والشفاء! نتمنى أن تكون قد استمتعت بطلبك. يمكنك بدء طلب جديد في أي وقت من القائمة.</p>
        {onBackToMenu && (
          <Button
            className="w-full mt-4 bg-[#D4AF37] text-black font-bold hover:bg-[#c9a430]"
            onClick={onBackToMenu}
          >
            العودة للقائمة
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold">تتبع الطلب</h2>
          <p className="text-sm text-muted-foreground">
            طلب #{order.orderNumber}
          </p>
        </div>
        <button
          onClick={() => fetchOrder(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#222] text-gray-400 transition-colors hover:bg-[#333] hover:text-white"
          disabled={refreshing}
          aria-label="تحديث"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Order type badge */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
        <OrderTypeIcon type={order.type} className="h-5 w-5 text-[#D4AF37]" />
        <div className="flex-1">
          <span className="text-sm font-bold">{getOrderTypeLabel(order.type)}</span>
          {order.type === 'DINE_IN' && order.tableNumber && (
            <p className="text-xs text-muted-foreground">طاولة رقم {order.tableNumber}</p>
          )}
        </div>
        {isCancelled ? (
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-400">
            ملغي
          </span>
        ) : (
          <span className="rounded-full bg-[#D4AF37]/20 px-3 py-1 text-xs font-bold text-[#D4AF37]">
            {STATUS_STEPS[currentStatusIndex]?.label}
          </span>
        )}
      </div>

      {/* Estimated time */}
      {!isCancelled && currentStatusIndex < STATUS_STEPS.length - 1 && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 text-sm">
          <Clock className="h-4 w-4 text-[#D4AF37]" />
          <span className="text-muted-foreground">الوقت المتوقع:</span>
          <span className="font-bold text-foreground">{getEstimatedTime(order)}</span>
        </div>
      )}

      {/* Status Timeline */}
      <div className="space-y-0">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = !isCancelled && currentStatusIndex > index
          const isCurrent = !isCancelled && currentStatusIndex === index
          const isFuture = !isCancelled && currentStatusIndex < index
          const StepIcon = step.icon

          return (
            <div key={step.key} className="relative flex gap-4">
              {/* Vertical line connector */}
              {index < STATUS_STEPS.length - 1 && (
                <div className="absolute right-[15px] top-8 h-full w-0.5">
                  <motion.div
                    className="h-full w-full"
                    initial={{ backgroundColor: 'color-mix(in oklch, var(--foreground) 10%, transparent)' }}
                    animate={{
                      backgroundColor: isCompleted ? '#22c55e' : 'color-mix(in oklch, var(--foreground) 10%, transparent)',
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}

              {/* Step indicator */}
              <div className="relative z-10 flex-shrink-0 pt-1">
                <motion.div
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    isCompleted
                      ? 'border-green-500 bg-green-500'
                      : isCurrent
                        ? 'border-[#D4AF37] bg-[#D4AF37]'
                        : 'border-border bg-card'
                  }`}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={isCurrent ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-white" />
                  ) : isCurrent ? (
                    <StepIcon className="h-4 w-4 text-black" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-foreground/20" />
                  )}
                </motion.div>
              </div>

              {/* Step content */}
              <div className="flex-1 pb-6">
                <motion.div
                  className={`rounded-lg p-3 transition-all duration-300 ${
                    isCurrent
                      ? 'border border-[#D4AF37]/30 bg-[#D4AF37]/10'
                      : isCompleted
                        ? 'bg-[#222]'
                        : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-bold ${
                        isCompleted
                          ? 'text-green-400'
                          : isCurrent
                            ? 'text-[#D4AF37]'
                            : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <motion.div
                        className="flex items-center gap-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Loader2 className="h-3 w-3 animate-spin text-[#D4AF37]" />
                        <span className="text-[10px] text-[#D4AF37]">جارٍ</span>
                      </motion.div>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] text-green-400">تم ✓</span>
                    )}
                  </div>
                  {isCurrent && (
                    <motion.p
                      className="mt-1 text-xs text-muted-foreground"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      {step.key === 'PENDING' && (order.type === 'DINE_IN' ? 'في انتظار مراجعة الويتر للطلب...' : 'في انتظار تأكيد خدمة العملاء لطلبك...')}
                      {step.key === 'CONFIRMED' && 'تم تأكيد طلبك وسيبدأ التحضير قريباً'}
                      {step.key === 'PREPARING' && 'المطبخ يحضر طلبك الآن'}
                      {step.key === 'READY' && (order.type === 'DINE_IN' ? 'الطلب جاهز للتنزيل على الطاولة' : order.type === 'TAKEAWAY' ? 'طلبك جاهز للاستلام من المطعم' : 'طلبك في الطريق إليك الآن')}
                      {step.key === 'READY_TO_PAY' && 'طلبك جاهز، يرجى التوجه للدفع'}
                      {step.key === 'DELIVERED' && 'تم تسليم طلبك'}
                    </motion.p>
                  )}
                </motion.div>
              </div>
            </div>
          )
        })}

        {/* Cancelled state */}
        <AnimatePresence>
          {isCancelled && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center"
            >
              <XCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
              <p className="text-sm font-bold text-red-400">تم إلغاء هذا الطلب</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="bg-foreground/10" />

      {/* Order items summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground/80">تفاصيل الطلب</h3>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg bg-[#222] p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {item.mealTitleAr || item.mealTitle}
                </p>
                {Array.isArray(item.addOns) && item.addOns.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {item.addOns.map((addon: any, idx: number) => (
                      <span key={idx} className="text-[10px] text-gray-500">
                        + {addon.titleAr || addon.title}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {item.quantity} × {item.price.toFixed(2)} جنيه
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-[#D4AF37]">
                {(item.price * item.quantity).toFixed(2)} جنيه
              </span>
            </div>
          ))}
        </div>

        {/* Price summary */}
        <div className="space-y-1.5 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>المجموع الفرعي</span>
            <span>{order.subtotal.toFixed(2)} جنيه</span>
          </div>
          {order.serviceCharge > 0 && (
            <div className="flex justify-between text-sm text-[#D4AF37]">
              <span>رسوم الخدمة</span>
              <span>+ {order.serviceCharge.toFixed(2)} جنيه</span>
            </div>
          )}
          <Separator className="bg-[#D4AF37]/20" />
          <div className="flex justify-between font-bold text-foreground">
            <span>الإجمالي</span>
            <span className="text-[#D4AF37]">{order.total.toFixed(2)} جنيه</span>
          </div>
        </div>
      </div>

      {/* Back to Menu Button */}
      {onBackToMenu && (
        <Button
          className="w-full gap-2 py-5 text-base font-bold text-black hover:bg-[#c9a430]"
          style={{ backgroundColor: '#D4AF37' }}
          onClick={onBackToMenu}
        >
          <ArrowRight className="h-4 w-4" />
          العودة للقائمة
        </Button>
      )}
    </div>
  )
}

