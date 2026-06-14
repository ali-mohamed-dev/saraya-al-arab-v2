'use client'

import { motion } from 'framer-motion'
import { Clock, Phone, Utensils, Receipt, CheckCircle, Loader2, BadgeCheck, XCircle, PlusCircle, Package, MapPin } from 'lucide-react'
import type { Order } from '@/lib/saraya/types'
import { ORDER_STATUS_MAP, ORDER_TYPE_MAP } from '@/lib/saraya/constants'
import { getRelativeTime } from '@/lib/saraya/helpers'
import { getOrderTypeIcon } from './cashier-utils'

const AREA_STYLES: Record<string, { label: string; ready: string; prep: string; canc: string; idle: string }> = {
  KITCHEN: {
    label: 'مطبخ',
    ready: 'bg-green-500/15 text-green-400 border-green-500/20',
    prep: 'bg-amber-500/15 text-amber-400 border-amber-500/20 animate-pulse',
    canc: 'bg-red-500/15 text-red-400 border-red-500/20',
    idle: 'bg-muted/50 text-muted-foreground border-transparent',
  },
  BARISTA: {
    label: 'باريستا',
    ready: 'bg-green-500/15 text-green-400 border-green-500/20',
    prep: 'bg-amber-500/15 text-amber-400 border-amber-500/20 animate-pulse',
    canc: 'bg-red-500/15 text-red-400 border-red-500/20',
    idle: 'bg-muted/50 text-muted-foreground border-transparent',
  },
}

interface OrderCardProps {
  order: Order
  relativeTime: string
  updatingOrderId: string | null
  onConfirm: (orderId: string) => void | Promise<void>
  onMarkAsPaid: (orderId: string) => void | Promise<void>
  onViewReceipt: (order: Order) => void
  onReject?: (orderId: string) => void | Promise<void>
  onAddItems?: (order: Order) => void
}

function getCashierDisplayStatus(order: Order) {
  if (order.type === 'DINE_IN' && order.status === 'READY') {
    return { label: 'قيد التشغيل', color: ORDER_STATUS_MAP.PREPARING.color, bg: ORDER_STATUS_MAP.PREPARING.bg }
  }
  return {
    label: ORDER_STATUS_MAP[order.status]?.label || order.status,
    color: ORDER_STATUS_MAP[order.status]?.color || '',
    bg: ORDER_STATUS_MAP[order.status]?.bg || '',
  }
}

function AreaBadge({ area, status }: { area: string; status: string }) {
  const styles = AREA_STYLES[area] || AREA_STYLES.KITCHEN
  const statusClass =
    status === 'READY' ? styles.ready :
    status === 'PREPARING' ? styles.prep :
    status === 'CANCELLED' ? styles.canc :
    styles.idle

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium leading-none ${statusClass}`}>
      {styles.label}: {ORDER_STATUS_MAP[status]?.label || status}
    </span>
  )
}

export function OrderCard({ order, relativeTime, updatingOrderId, onConfirm, onMarkAsPaid, onViewReceipt, onReject, onAddItems }: OrderCardProps) {
  const statusInfo = getCashierDisplayStatus(order)
  const typeInfo = ORDER_TYPE_MAP[order.type]
  const isReady = order.status === 'READY_TO_PAY' || (order.status === 'READY' && order.type !== 'DINE_IN')

  return (
    <motion.div
      key={order.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      layout
    >
      <div
        onClick={() => onViewReceipt(order)}
        className={`relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 ${
          isReady
            ? 'border-green-500/40 hover:border-green-400/60 bg-gradient-to-br from-green-500/[0.04] to-transparent'
            : 'border-border/60 hover:border-[#D4AF37]/30 bg-card hover:bg-muted/20'
        }`}
        dir="rtl"
      >
        {/* Top accent */}
        <div className={`h-0.5 w-full ${isReady ? 'bg-gradient-to-l from-green-500 to-green-400/30' : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/20'}`} />

        <div className="p-3 space-y-2.5">
          {/* Row 1: Order number + Status + Time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                isReady ? 'bg-green-500/15 text-green-400' : 'bg-[#D4AF37]/15 text-[#D4AF37]'
              }`}>
                #{order.orderNumber}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${statusInfo?.bg || ''}`}>
                    <span className={statusInfo?.color || ''}>{statusInfo?.label || order.status}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-medium ${typeInfo?.color || ''}`}>
                    {getOrderTypeIcon(order.type)}{typeInfo?.label || order.type}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                  <span className="text-[9px] text-muted-foreground/60">{relativeTime || getRelativeTime(order.createdAt)}</span>
                </div>
              </div>
            </div>
            {order.type === 'DINE_IN' && order.tableNumber && (
              <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 rounded-md px-2 py-1 border border-blue-500/20 shrink-0">
                <Utensils className="h-3 w-3" />
                {order.tableNumber}
              </div>
            )}
          </div>

          {/* Area status badges */}
          <div className="flex flex-wrap gap-1">
            {order.items.some(i => i.preparationArea === 'KITCHEN') && (
              <AreaBadge area="KITCHEN" status={order.kitchenStatus} />
            )}
            {order.items.some(i => i.preparationArea === 'BARISTA') && (
              <AreaBadge area="BARISTA" status={order.baristaStatus} />
            )}
            {order.payments?.map((p, i) => (
              <span key={i} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium leading-none ${
                p.method === 'CASH' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                p.method === 'VISA' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                'border-purple-500/30 text-purple-400 bg-purple-500/10'
              }`}>
                {p.method === 'CASH' ? 'كاش' : p.method === 'VISA' ? 'فيزا' : 'فودافون كاش'}
                : {p.amount.toFixed(0)} ج.م
              </span>
            ))}
          </div>

          {/* Customer & items */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground/80">{order.customerName}</span>
            {order.customerPhone && <span dir="ltr">· {order.customerPhone}</span>}
            {order.type === 'DELIVERY' && <MapPin className="h-2.5 w-2.5" />}
            {order.type === 'TAKEAWAY' && <Package className="h-2.5 w-2.5" />}
          </div>

          {/* Items */}
          <div className="space-y-1">
            {order.items.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[8px] font-bold flex-shrink-0">{item.quantity}</span>
                  <span className="truncate">{item.mealTitleAr || item.mealTitle}</span>
                </div>
                <span className="text-muted-foreground flex-shrink-0 mr-1">{(item.price * item.quantity).toFixed(0)} ج.م</span>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-[9px] text-muted-foreground text-center pt-0.5">+{order.items.length - 3} أصناف أخرى</p>
            )}
          </div>

          {/* Divider + Actions */}
          <div className="border-t border-border/20 pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground">الإجمالي</p>
                <p className={`text-base font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>{order.total.toFixed(2)} ج.م</p>
              </div>
              {order.status === 'PENDING' && order.type !== 'DINE_IN' ? (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); onConfirm(order.id) }} disabled={updatingOrderId === order.id}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold text-[11px] transition-all disabled:opacity-50">
                    {updatingOrderId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    تأكيد
                  </button>
                  {onReject && (
                    <button onClick={(e) => { e.stopPropagation(); onReject(order.id) }} disabled={updatingOrderId === order.id}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ) : isReady ? (
                <div className="flex gap-1">
                  {onAddItems && (
                    <button onClick={(e) => { e.stopPropagation(); onAddItems(order) }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all">
                      <PlusCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onMarkAsPaid(order.id) }} disabled={updatingOrderId === order.id}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green-600 text-white hover:bg-green-500 font-bold text-[11px] transition-all disabled:opacity-50">
                    {updatingOrderId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                    تم الدفع
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  {onAddItems && !['DELIVERED', 'CANCELLED'].includes(order.status) && (
                    <button onClick={(e) => { e.stopPropagation(); onAddItems(order) }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all">
                      <PlusCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onViewReceipt(order) }}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-[11px] font-medium transition-all">
                    <Receipt className="h-3 w-3" />الفاتورة
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
