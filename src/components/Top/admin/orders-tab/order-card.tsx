'use client'

import { Phone, MapPin, Utensils, Check, Flame, CheckCircle, BadgeCheck, X, Loader2, Package, Eye, Clock, ChefHat } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ORDER_STATUS_MAP } from '@/lib/saraya/constants'
import type { Order } from '@/lib/saraya/types'
import { getRelativeTime } from '@/lib/saraya/helpers'

const ORDER_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  DINE_IN:   { label: 'صالة',    icon: <Utensils className="h-3 w-3" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  TAKEAWAY:  { label: 'تيكاوي', icon: <Package  className="h-3 w-3" />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  DELIVERY:  { label: 'ديليفري', icon: <Phone    className="h-3 w-3" />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
}

interface OrderCardProps {
  order: Order
  relativeTime: string
  isUpdating: boolean
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<void> | void
  onCancel: (order: Order) => void
  onPrint: (order: Order) => void
  onViewReceipt: (order: Order) => void
}

const statusActions: Record<string, { nextStatus: string; label: string; icon: React.ReactNode; className: string } | null> = {
  PENDING:     { nextStatus: 'CONFIRMED',   label: 'تأكيد',   icon: <Check className="h-3.5 w-3.5" />,      className: 'bg-green-600 hover:bg-green-700 text-white' },
  CONFIRMED:   { nextStatus: 'PREPARING',   label: 'تحضير',   icon: <Flame className="h-3.5 w-3.5" />,      className: 'bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black' },
  PREPARING:   { nextStatus: 'READY',       label: 'جاهز',    icon: <CheckCircle className="h-3.5 w-3.5" />, className: 'bg-blue-600 hover:bg-blue-700 text-white' },
  READY:       { nextStatus: 'DELIVERED',   label: 'تسليم',   icon: <BadgeCheck className="h-3.5 w-3.5" />,  className: 'bg-green-600 hover:bg-green-500 text-white' },
  READY_TO_PAY:{ nextStatus: 'DELIVERED',   label: 'دفع',     icon: <BadgeCheck className="h-3.5 w-3.5" />,  className: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
  DELIVERED:   null,
  CANCELLED:   null,
}

export function OrderCard({ order, relativeTime, isUpdating, onUpdateStatus, onCancel, onPrint, onViewReceipt }: OrderCardProps) {
  const statusInfo = ORDER_STATUS_MAP[order.status] ?? ORDER_STATUS_MAP.PENDING
  const typeConfig = ORDER_TYPE_CONFIG[order.type] ?? ORDER_TYPE_CONFIG.DINE_IN
  const isFinal = order.status === 'CANCELLED'
  const action = statusActions[order.status]

  const hasKitchenItems = order.items.some(i => i.preparationArea === 'KITCHEN')
  const hasBaristaItems = order.items.some(i => i.preparationArea === 'BARISTA')

  const getPrepPill = (area: 'kitchen' | 'barista') => {
    const status = area === 'kitchen' ? order.kitchenStatus : order.baristaStatus
    const label = area === 'kitchen' ? 'مطبخ' : 'باريستا'
    if (status === 'PENDING' || status === 'CONFIRMED') return null
    return (
      <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded ${
        status === 'READY' ? 'bg-green-500/15 text-green-400' :
        status === 'CANCELLED' ? 'bg-red-500/15 text-red-400' :
        'bg-amber-500/15 text-amber-400'
      }`}>
        <ChefHat className="h-2.5 w-2.5" />
        {label}: {ORDER_STATUS_MAP[status]?.label || status}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      layout
    >
      <Card className={`border overflow-hidden transition-all duration-200 ${
        isFinal ? 'border-border/30 opacity-70' :
        order.status === 'READY' || order.status === 'READY_TO_PAY'
          ? 'border-green-500/40 hover:border-green-500/60 bg-green-500/[0.03]'
          : 'border-border/40 hover:border-[#D4AF37]/30 bg-card'
      }`} dir="rtl">
        <div className={`h-0.5 ${
          isFinal ? 'bg-border/30' :
          order.status === 'READY' || order.status === 'READY_TO_PAY'
            ? 'bg-gradient-to-l from-green-500 to-green-400/40'
            : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/40'
        }`} />

        <CardContent className="p-3 sm:p-4 space-y-2.5">
          {/* Header: Order # + Status + Type + Time */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                isFinal ? 'bg-muted' :
                order.status === 'READY' || order.status === 'READY_TO_PAY' ? 'bg-green-500/10' : 'bg-[#D4AF37]/10'
              } shrink-0`}>
                <span className={`text-sm font-bold ${isFinal ? 'text-muted-foreground' : order.status === 'READY' || order.status === 'READY_TO_PAY' ? 'text-green-400' : 'text-[#D4AF37]'}`}>
                  #{order.orderNumber}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={`h-5 px-2 text-[9px] font-bold border ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.label}
                  </Badge>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded ${typeConfig.bg} ${typeConfig.color}`}>
                    {typeConfig.icon}{typeConfig.label}
                  </span>
                  {order.type === 'DINE_IN' && order.tableNumber && (
                    <span className="text-[9px] text-blue-400 font-medium">
                      طاولة {order.tableNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                  <span className="text-[9px] text-muted-foreground/60">
                    {relativeTime || getRelativeTime(order.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Prep pills */}
            <div className="flex flex-col gap-0.5 items-end shrink-0">
              {hasKitchenItems && getPrepPill('kitchen')}
              {hasBaristaItems && getPrepPill('barista')}
            </div>
          </div>

          {/* Customer */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground/80">{order.customerName}</span>
            {order.customerPhone && (
              <span className="flex items-center gap-1" dir="ltr">
                <Phone className="h-3 w-3 text-muted-foreground/50" />
                {order.customerPhone}
              </span>
            )}
            {order.deliveryAddress && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <MapPin className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                <span className="truncate">{order.deliveryAddress}</span>
              </span>
            )}
            {order.status === 'CANCELLED' && order.cancelledBy && (
              <span className="text-red-300 text-[10px]">— {order.cancelledBy}</span>
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

          {/* Items */}
          <div className="space-y-1">
            {order.items.slice(0, 4).map(item => (
              <div key={item.id} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-muted text-[9px] font-bold shrink-0">
                    {item.quantity}
                  </span>
                  <span className="truncate">{item.mealTitleAr || item.mealTitle}</span>
                </div>
                <span className="text-muted-foreground shrink-0 mr-2">
                  {(item.price * item.quantity).toFixed(2)} ج.م
                </span>
              </div>
            ))}
            {order.items.length > 4 && (
              <p className="text-[10px] text-muted-foreground text-center">
                +{order.items.length - 4} أصناف أخرى
              </p>
            )}
            {order.notes && (
              <p className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-2 py-1">
                {order.notes}
              </p>
            )}
          </div>

          {/* Footer: Total + Actions */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/20">
            <div>
              <p className="text-[9px] text-muted-foreground">الإجمالي</p>
              <p className={`text-base font-bold ${isFinal ? 'text-foreground/60' : order.status === 'READY' || order.status === 'READY_TO_PAY' ? 'text-green-400' : 'text-[#D4AF37]'}`}>
                {order.total.toFixed(2)} ج.م
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onViewReceipt(order)}
                className="h-8 px-2.5 rounded-lg border border-slate-500/20 text-slate-400 hover:bg-slate-500/10 text-[10px] font-medium transition-all flex items-center gap-1">
                <Eye className="h-3 w-3" /> فاتورة
              </button>
              {action && (
                <button onClick={() => onUpdateStatus(order.id, action.nextStatus)}
                  disabled={isUpdating}
                  className={`h-8 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${action.className}`}>
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : action.icon}
                  {action.label}
                </button>
              )}
              {!isFinal && (
                <button onClick={() => onCancel(order)} disabled={isUpdating}
                  className="h-8 w-8 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
