'use client'

import { Clock, Phone, MapPin, Utensils, Download, Check, Flame, CheckCircle, BadgeCheck, X, Loader2, Package, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ORDER_STATUS_MAP } from '@/lib/saraya/constants'
import type { Order } from '@/lib/saraya/types'
import { getRelativeTime } from '@/lib/saraya/helpers'

const ORDER_TYPE_MAP_WITH_ICONS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DINE_IN:   { label: 'صالة',    icon: <Utensils className="h-3.5 w-3.5" />, color: 'text-blue-400'   },
  TAKEAWAY:  { label: 'تيكاوي', icon: <Package  className="h-3.5 w-3.5" />, color: 'text-orange-400' },
  DELIVERY:  { label: 'ديليفري', icon: <Phone    className="h-3.5 w-3.5" />, color: 'text-purple-400' },
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

export function OrderCard({ order, relativeTime, isUpdating, onUpdateStatus, onCancel, onPrint, onViewReceipt }: OrderCardProps) {
  const statusInfo = ORDER_STATUS_MAP[order.status] ?? ORDER_STATUS_MAP.PENDING
  const typeInfo   = ORDER_TYPE_MAP_WITH_ICONS[order.type] ?? ORDER_TYPE_MAP_WITH_ICONS.DINE_IN
  const isReady    = order.status === 'READY' || order.status === 'READY_TO_PAY'

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      layout
      className="max-w-full overflow-hidden"
    >
      <Card
        className={`border overflow-hidden transition-all duration-200 ${
          isReady
            ? 'border-green-500/50 hover:border-green-400/70 bg-green-500/5'
            : 'border-border/50 hover:border-[#D4AF37]/40 bg-card'
        }`}
        dir="rtl"
      >
        {/* Color stripe — same as cashier */}
        <div className={`h-1 ${isReady ? 'bg-gradient-to-l from-green-500 to-green-400/40' : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/40'}`} />

        <CardContent className="p-4 space-y-3">

          {/* ── Header ── */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {/* Order number badge */}
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isReady ? 'bg-green-500/10' : 'bg-[#D4AF37]/10'}`}>
                <span className={`text-sm font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>
                  #{order.orderNumber}
                </span>
              </div>

              <div>
                {/* Status + type */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusInfo.bg}`}>
                    <span className={statusInfo.color}>{statusInfo.label}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${typeInfo.color}`}>
                    {typeInfo.icon}{typeInfo.label}
                  </span>
                </div>
                {/* Time */}
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    {relativeTime || getRelativeTime(order.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Table badge */}
            {order.type === 'DINE_IN' && order.tableNumber && (
              <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px] gap-1">
                <Utensils className="h-2.5 w-2.5" />طاولة {order.tableNumber}
              </Badge>
            )}
          </div>

          {/* ── Kitchen / Barista status pills ── */}
          <div className="flex flex-wrap gap-2">
            {order.items.some(i => i.preparationArea === 'KITCHEN') && (
              <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${
                order.kitchenStatus === 'READY'     ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                order.kitchenStatus === 'CANCELLED' ? 'bg-red-500/20   text-red-400   border-red-500/30'   :
                order.kitchenStatus === 'PREPARING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' :
                'bg-muted text-muted-foreground'
              }`}>
                🔥 مطبخ: {ORDER_STATUS_MAP[order.kitchenStatus]?.label || order.kitchenStatus}
              </Badge>
            )}
            {order.items.some(i => i.preparationArea === 'BARISTA') && (
              <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${
                order.baristaStatus === 'READY'     ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                order.baristaStatus === 'CANCELLED' ? 'bg-red-500/20   text-red-400   border-red-500/30'   :
                order.baristaStatus === 'PREPARING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' :
                'bg-blue-500/20  text-blue-400  border-blue-500/30'
              }`}>
                ☕ باريستا: {ORDER_STATUS_MAP[order.baristaStatus]?.label || order.baristaStatus}
              </Badge>
            )}
          </div>

          {/* ── Customer info ── */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground min-w-0">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <span className="truncate max-w-full">{order.customerName}</span>
              {order.customerPhone && (
                <span className="flex items-center gap-1 flex-shrink-0" dir="ltr">
                  <Phone className="h-3 w-3" />{order.customerPhone}
                </span>
              )}
              {order.deliveryAddress && (
                <span className="flex items-center gap-1 truncate min-w-0 max-w-full">
                  <MapPin className="h-3 w-3 flex-shrink-0" />{order.deliveryAddress}
                </span>
              )}
            </div>
            {order.status === 'CANCELLED' && order.cancelledBy && (
              <div className="text-[10px] text-red-300">ملغي بواسطة: {order.cancelledBy}</div>
            )}
          </div>

          {/* ── Items list ── */}
          <div className="space-y-1.5">
            {order.items.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold flex-shrink-0">
                    {item.quantity}
                  </span>
                  <span className="break-words leading-snug">{item.mealTitleAr || item.mealTitle}</span>
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

          {/* ── Footer: total + admin action buttons ── */}
          <div className="flex items-center justify-between flex-wrap gap-2 max-w-full">
            <div>
              <p className="text-[10px] text-muted-foreground">الإجمالي</p>
              <p className={`text-lg font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>
                {order.total.toFixed(2)} ج.م
              </p>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {/* View Receipt */}
              <Button
                size="sm" variant="outline"
                onClick={() => onViewReceipt(order)}
                className="gap-1 border-slate-500/30 text-slate-400 hover:bg-slate-500/10 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold"
              >
                <Eye className="h-3 w-3" /> فاتورة
              </Button>

              

              {/* Status progression buttons */}
              {order.status === 'PENDING' && (
                <Button size="sm"
                  onClick={() => onUpdateStatus(order.id, 'CONFIRMED')}
                  disabled={isUpdating}
                  className="gap-1 bg-green-600 text-white hover:bg-green-700 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold"
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  تأكيد
                </Button>
              )}
              {order.status === 'CONFIRMED' && (
                <Button size="sm"
                  onClick={() => onUpdateStatus(order.id, 'PREPARING')}
                  disabled={isUpdating}
                  className="gap-1 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold"
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Flame className="h-3 w-3" />}
                  تحضير
                </Button>
              )}
              {order.status === 'PREPARING' && (
                <Button size="sm"
                  onClick={() => onUpdateStatus(order.id, 'READY')}
                  disabled={isUpdating}
                  className="gap-1 bg-blue-600 text-white hover:bg-blue-700 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold"
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                  جاهز
                </Button>
              )}
              {order.status === 'READY' && (
                <Button size="sm"
                  onClick={() => onUpdateStatus(order.id, 'DELIVERED')}
                  disabled={isUpdating}
                  className="gap-1 bg-green-600 text-white hover:bg-green-500 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold"
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />}
                  تسليم
                </Button>
              )}
              {order.status === 'READY_TO_PAY' && (
                <Button size="sm"
                  onClick={() => onUpdateStatus(order.id, 'DELIVERED')}
                  disabled={isUpdating}
                  className="gap-1 bg-emerald-600 text-white hover:bg-emerald-500 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold"
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />}
                  دفع
                </Button>
              )}

              {/* Cancel (admin only — always visible unless already cancelled) */}
              {order.status !== 'CANCELLED' && (
                <Button size="sm" variant="outline"
                  onClick={() => onCancel(order)}
                  disabled={isUpdating}
                  className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 sm:h-8 px-2 sm:px-3"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

        </CardContent>
      </Card>
    </motion.div>
  )
}
