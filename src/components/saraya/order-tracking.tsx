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

interface OrderData {
  id: string
  orderNumber: number
  type: string
  status: string
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
    addOns: string
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
  { key: 'DELIVERED', label: 'تم التسليم', labelEn: 'Delivered', icon: CheckCircle, estimatedMinutes: 0 },
]

// حالات مكتملة لا تظهر في الخط الزمني لكن تُعامَل كنهاية
const TERMINAL_STATUSES: Record<string, number> = {
  READY_TO_PAY: 3, // يساوي READY في الترتيب
  DELIVERED:    4,
}

function getStatusIndex(status: string): number {
  if (status in TERMINAL_STATUSES) return TERMINAL_STATUSES[status]
  const idx = STATUS_STEPS.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

function getEstimatedTime(order: OrderData): string {
  const statusIdx = getStatusIndex(order.status)
  if (statusIdx >= STATUS_STEPS.length - 1) return 'تم!'
  if (statusIdx === 0) return '15-45 دقيقة'

  // Calculate remaining time based on current step
  const currentStep = STATUS_STEPS[statusIdx]
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

function getOrderTypeLabel(type: string): string {
  switch (type) {
    case 'DINE_IN': return 'صالة'
    case 'TAKEAWAY': return 'تيكاوي'
    case 'DELIVERY': return 'ديليفري'
    default: return type
  }
}

function getOrderTypeIcon(type: string) {
  switch (type) {
    case 'DINE_IN': return UtensilsCrossed
    case 'TAKEAWAY': return ShoppingBag
    case 'DELIVERY': return Truck
    default: return Package
  }
}

export function OrderTracking({ orderId, onBackToMenu }: OrderTrackingProps) {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchOrder = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)

    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        throw new Error('فشل في جلب بيانات الطلب')
      }
      const data = await response.json()
      setOrder(data)
      setError(null)

      // إذا انتهى الطلب فعلياً، نمسحه من الذاكرة المحلية
      if (['DELIVERED', 'CANCELLED'].includes(data.status)) {
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

  // Auto-refresh every 5 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchOrder()
    }, 5000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchOrder])

  const currentStatusIndex = order ? getStatusIndex(order.status) : 0
  const isCancelled = order?.status === 'CANCELLED'
  const isReadyToPay = order?.status === 'READY_TO_PAY'
  const isDelivered = order?.status === 'DELIVERED'
  const isFinished = isDelivered

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-6" dir="rtl">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
        <p className="text-gray-400">جاري تحميل بيانات الطلب...</p>
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
        <p className="text-lg font-bold text-white">حدث خطأ</p>
        <p className="text-sm text-gray-400">{error || 'لم يتم العثور على الطلب'}</p>
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

  // شاشة "جاهز للدفع" - الكاشير سيتولى الأمر
  if (isReadyToPay) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20"
        >
          <CheckCircle className="h-10 w-10 text-emerald-400" />
        </motion.div>
        <p className="text-xl font-bold text-white">طلبك جاهز! 🎉</p>
        <p className="text-sm text-gray-400">طلبك تم تحضيره وجاهز للدفع. سيتولى الكاشير إتمام عملية الدفع.</p>
        <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300 text-center">
          في انتظار الكاشير للدفع
        </div>
        {onBackToMenu && (
          <Button
            className="w-full mt-2 bg-[#D4AF37] text-black font-bold hover:bg-[#c9a430]"
            onClick={onBackToMenu}
          >
            العودة للقائمة
          </Button>
        )}
      </div>
    )
  }

  // إذا تم التسليم، نعرض رسالة النجاح
  if (isFinished) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20"
        >
          <CheckCircle className="h-10 w-10 text-green-500" />
        </motion.div>
        <p className="text-xl font-bold text-white">تم توصيل طلبك بنجاح!</p>
        <p className="text-sm text-gray-400">بالهناء والشفاء! نتمنى أن تكون قد استمتعت بطلبك. يمكنك بدء طلب جديد في أي وقت من القائمة.</p>
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
          <h2 className="text-xl font-extrabold text-white">تتبع الطلب</h2>
          <p className="text-sm text-gray-400">
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
      <div className="flex items-center gap-3 rounded-xl bg-[#222] p-4">
        {(() => {
          const TypeIcon = getOrderTypeIcon(order.type)
          return <TypeIcon className="h-5 w-5 text-[#D4AF37]" />
        })()}
        <div className="flex-1">
          <span className="text-sm font-bold text-white">{getOrderTypeLabel(order.type)}</span>
          {order.type === 'DINE_IN' && order.tableNumber && (
            <p className="text-xs text-gray-400">طاولة رقم {order.tableNumber}</p>
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
          <span className="text-gray-300">الوقت المتوقع:</span>
          <span className="font-bold text-white">{getEstimatedTime(order)}</span>
        </div>
      )}

      {/* Status Timeline */}
      <div className="space-y-0">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = !isCancelled && currentStatusIndex > index
          const isCurrent = !isCancelled && currentStatusIndex === index
          const StepIcon = step.icon

          return (
            <div key={step.key} className="relative flex gap-4">
              {/* Vertical line connector */}
              {index < STATUS_STEPS.length - 1 && (
                <div className="absolute right-[15px] top-8 h-full w-0.5">
                  <motion.div
                    className="h-full w-full"
                    initial={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    animate={{
                      backgroundColor: isCompleted ? '#22c55e' : 'rgba(255,255,255,0.1)',
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
                        : 'border-white/20 bg-[#1A1A1A]'
                  }`}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={isCurrent ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-white" />
                  ) : isCurrent ? (
                    <StepIcon className="h-4 w-4 text-black" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-white/20" />
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
                      className="mt-1 text-xs text-gray-400"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      {step.key === 'PENDING' && (order.type === 'DINE_IN' ? 'في انتظار مراجعة الويتر للطلب...' : 'في انتظار تأكيد خدمة العملاء لطلبك...')}
                      {step.key === 'CONFIRMED' && 'تم تأكيد طلبك وسيبدأ التحضير قريباً'}
                      {step.key === 'PREPARING' && 'المطبخ يحضر طلبك الآن'}
                      {step.key === 'READY' && (order.type === 'DINE_IN' ? 'الطلب جاهز للتنزيل على الطاولة' : order.type === 'TAKEAWAY' ? 'طلبك جاهز للاستلام من المطعم' : 'طلبك في الطريق إليك الآن')}
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

      <Separator className="bg-white/10" />

      {/* Order items summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-300">تفاصيل الطلب</h3>
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
          <div className="flex justify-between text-sm text-gray-300">
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
          <div className="flex justify-between font-bold text-white">
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
