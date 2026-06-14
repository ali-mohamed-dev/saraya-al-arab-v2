'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Clock, Eye, Check, Loader2, Utensils, Package, Phone, 
  Flame, Coffee, ChevronDown, ChevronUp, AlertCircle, Send, PlusCircle
} from 'lucide-react'
import { ORDER_STATUS_MAP } from '@/lib/saraya/constants'
import { getRelativeTime } from '@/lib/saraya/helpers'
import type { Order } from '@/lib/saraya/types'

const ORDER_TYPE_MAP_WITH_ICONS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DINE_IN: { label: 'صالة', icon: <Utensils className="h-3 w-3" />, color: 'text-blue-400' },
  TAKEAWAY: { label: 'تيكاوي', icon: <Package className="h-3 w-3" />, color: 'text-orange-400' },
  DELIVERY: { label: 'ديليفري', icon: <Phone className="h-3 w-3" />, color: 'text-purple-400' },
}

const AREA_STYLES: Record<string, { icon: React.ReactNode; ready: string; prep: string; wait: string }> = {
  KITCHEN: {
    icon: <Flame className="h-2.5 w-2.5" />,
    ready: 'border-green-500/25 bg-green-500/10 text-green-400',
    prep: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
    wait: 'border-orange-500/25 bg-orange-500/10 text-orange-400',
  },
  BARISTA: {
    icon: <Coffee className="h-2.5 w-2.5" />,
    ready: 'border-green-500/25 bg-green-500/10 text-green-400',
    prep: 'border-blue-500/25 bg-blue-500/10 text-blue-400',
    wait: 'border-blue-500/25 bg-blue-500/10 text-blue-400',
  },
}

interface OrderCardProps {
  order: Order
  updatingOrderId: string | null
  onConfirm: () => void
  onConfirmAdditions?: () => void
  onViewDetails: () => void
  onAddItems?: () => void
}

function AreaBadge({ area, status }: { area: string; status: string }) {
  const styles = AREA_STYLES[area] || AREA_STYLES.KITCHEN
  const statusClass =
    status === 'READY' ? styles.ready :
    status === 'PREPARING' ? styles.prep :
    styles.wait
  const label =
    status === 'READY' ? 'جاهز' :
    status === 'PREPARING' ? 'يحضر' :
    'ينتظر'

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8px] font-medium leading-none ${statusClass}`}>
      {styles.icon} {area === 'KITCHEN' ? 'مطبخ' : 'باريستا'}: {label}
    </span>
  )
}

export function OrderCard({
  order,
  updatingOrderId,
  onConfirm,
  onConfirmAdditions,
  onViewDetails,
  onAddItems,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false)
  const statusInfo = ORDER_STATUS_MAP[order.status] ?? ORDER_STATUS_MAP.PENDING
  const typeInfo = ORDER_TYPE_MAP_WITH_ICONS[order.type] ?? ORDER_TYPE_MAP_WITH_ICONS.DINE_IN
  const isReady = order.status === 'READY'
  const hasUnconfirmedAdditions = (!order.kitchenAccess || !order.baristaAccess) && order.status !== 'PENDING'

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
        className={`relative rounded-xl border overflow-hidden transition-all duration-200 ${
          hasUnconfirmedAdditions
            ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/[0.04] to-transparent'
            : isReady
            ? 'border-green-500/40 bg-gradient-to-br from-green-500/[0.04] to-transparent'
            : 'border-border/60 bg-card hover:border-[#D4AF37]/30 hover:bg-muted/20'
        }`}
        dir="rtl"
      >
        {/* Top accent */}
        <div className={`h-0.5 w-full ${
          hasUnconfirmedAdditions 
            ? 'bg-gradient-to-l from-amber-500 to-amber-400/30' 
            : isReady 
            ? 'bg-gradient-to-l from-green-500 to-green-400/30' 
            : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/20'
        }`} />

        <div className="p-3 space-y-2.5">
          {/* Header: Order Number + Status + Type + Time */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                isReady ? 'bg-green-500/15 text-green-400' : 'bg-[#D4AF37]/15 text-[#D4AF37]'
              }`}>
                #{order.orderNumber}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${statusInfo.bg}`}>
                    <span className={statusInfo.color}>{statusInfo.label}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-medium ${typeInfo.color}`}>
                    {typeInfo.icon}{typeInfo.label}
                  </span>
                  {hasUnconfirmedAdditions && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-medium text-amber-400 animate-pulse">
                      <AlertCircle className="h-2 w-2" /> إضافات
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                  <RelativeTimeText dateStr={order.createdAt} />
                </div>
              </div>
            </div>
            {order.tableNumber && (
              <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 rounded-md px-2 py-1 border border-blue-500/20 shrink-0">
                <Utensils className="h-3 w-3" />
                {order.tableNumber}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-1">
            {(expanded ? order.items : order.items.slice(0, 3)).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[8px] font-bold flex-shrink-0">{item.quantity}</span>
                  <span className="truncate text-[11px] font-medium">{item.mealTitleAr || item.mealTitle}</span>
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{(item.price * item.quantity).toFixed(0)} ج.م</span>
              </div>
            ))}
            {order.items.length > 3 && !expanded && (
              <button onClick={() => setExpanded(true)}
                className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 pt-0.5">
                <ChevronDown className="h-3 w-3" />+{order.items.length - 3} أصناف أخرى
              </button>
            )}
            {expanded && order.items.length > 3 && (
              <button onClick={() => setExpanded(false)}
                className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 pt-0.5">
                <ChevronUp className="h-3 w-3" /> عرض أقل
              </button>
            )}
          </div>

          {/* Kitchen & Barista Statuses */}
          {(order.kitchenStatus || order.baristaStatus) && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <div className="flex gap-1 flex-wrap">
              {order.items.some(i => i.preparationArea === 'KITCHEN') && (
                <AreaBadge area="KITCHEN" status={order.kitchenStatus} />
              )}
              {order.items.some(i => i.preparationArea === 'BARISTA') && (
                <AreaBadge area="BARISTA" status={order.baristaStatus} />
              )}
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-400">
              {order.notes}
            </div>
          )}

          {/* Border separator */}
          <div className="border-t border-border/20 pt-2.5" />

          {/* Unconfirmed additions alert */}
          {hasUnconfirmedAdditions && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[11px] font-bold">إضافات جديدة بحاجة لتأكيدك</span>
              </div>
              <button onClick={onConfirmAdditions} disabled={updatingOrderId === order.id}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-[11px] font-bold transition-all disabled:opacity-50">
                {updatingOrderId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                تأكيد وإرسال للمطبخ
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground">الإجمالي</p>
              <p className={`text-base font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>{order.total.toFixed(2)} ج.م</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onAddItems && order.status !== 'PENDING' && (
                <button onClick={onAddItems}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all">
                  <PlusCircle className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={onViewDetails}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-slate-500/30 text-slate-400 hover:bg-slate-500/10 text-[10px] font-medium transition-all">
                <Eye className="h-3 w-3" />التفاصيل
              </button>
              {order.status === 'PENDING' && (
                <button onClick={onConfirm} disabled={updatingOrderId === order.id}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green-600 text-white hover:bg-green-500 text-[11px] font-bold transition-all disabled:opacity-50">
                  {updatingOrderId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  تأكيد
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Inline RelativeTime that self-updates ──────────────────────────────────
function RelativeTimeText({ dateStr }: { dateStr: string }) {
  const [text, setText] = useState(() => getRelativeTime(dateStr))

  useEffect(() => {
    const id = setInterval(() => setText(getRelativeTime(dateStr)), 30000)
    return () => clearInterval(id)
  }, [dateStr])

  return <span className="text-[9px] text-muted-foreground/60">{text}</span>
}
