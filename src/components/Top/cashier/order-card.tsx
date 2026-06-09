'use client'

import { motion } from 'framer-motion'
import { Clock, Phone, Utensils, Receipt, CheckCircle, Loader2, BadgeCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import type { Order } from '@/lib/saraya/types'
import { ORDER_STATUS_MAP, ORDER_TYPE_MAP } from '@/lib/saraya/constants'
import { getRelativeTime } from '@/lib/saraya/helpers'
import { getOrderTypeIcon } from './cashier-utils'

interface OrderCardProps {
  order: Order
  relativeTime: string
  updatingOrderId: string | null
  onConfirm: (orderId: string) => void | Promise<void>
  onMarkAsPaid: (orderId: string) => void | Promise<void>
  onViewReceipt: (order: Order) => void
}

function getCashierDisplayStatus(order: Order) {
  if (order.type === 'DINE_IN' && order.status === 'READY') {
    return {
      label: 'قيد التشغيل',
      color: ORDER_STATUS_MAP.PREPARING.color,
      bg: ORDER_STATUS_MAP.PREPARING.bg,
    }
  }

  return {
    label: ORDER_STATUS_MAP[order.status]?.label || order.status,
    color: ORDER_STATUS_MAP[order.status]?.color || '',
    bg: ORDER_STATUS_MAP[order.status]?.bg || '',
  }
}

export function OrderCard({ order, relativeTime, updatingOrderId, onConfirm, onMarkAsPaid, onViewReceipt }: OrderCardProps) {
  const statusInfo = getCashierDisplayStatus(order)
  const typeInfo = ORDER_TYPE_MAP[order.type]
  const isReady = order.status === 'READY_TO_PAY' || (order.status === 'READY' && order.type !== 'DINE_IN')

  return (
    <motion.div key={order.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} layout>
      <Card
        className={`border overflow-hidden cursor-pointer transition-all duration-200 ${isReady ? 'border-green-500/50 hover:border-green-400/70 bg-green-500/5' : 'border-border/50 hover:border-[#D4AF37]/40 bg-card'}`}
        onClick={() => onViewReceipt(order)}
        dir="rtl"
      >
        <div className={`h-1 ${isReady ? 'bg-gradient-to-l from-green-500 to-green-400/40' : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/40'}`} />
        <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg ${isReady ? 'bg-green-500/10' : 'bg-[#D4AF37]/10'}`}>
                <span className={`text-[10px] sm:text-sm font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>#{order.orderNumber}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium ${statusInfo?.bg || ''}`}>
                    <span className={statusInfo?.color || ''}>{statusInfo?.label || order.status}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium ${typeInfo?.color || ''}`}>
                    {getOrderTypeIcon(order.type)}{typeInfo?.label || order.type}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">{relativeTime || getRelativeTime(order.createdAt)}</span>
                </div>
              </div>
            </div>
            {order.type === 'DINE_IN' && order.tableNumber && (
              <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[9px] sm:text-[10px] gap-1 shrink-0">
                <Utensils className="h-2 w-2 sm:h-2.5 sm:w-2.5" />طاولة {order.tableNumber}
              </Badge>
            )}
          </div>

          {/* Kitchen / Barista status indicators */}
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {order.items.some(i => i.preparationArea === 'KITCHEN') && (
              <Badge variant="secondary" className={`text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 ${
                order.kitchenStatus === 'READY' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                order.kitchenStatus === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                order.kitchenStatus === 'PREPARING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' :
                'bg-muted text-muted-foreground'
              }`}>
                المطبخ: {ORDER_STATUS_MAP[order.kitchenStatus]?.label || order.kitchenStatus}
              </Badge>
            )}
            {order.items.some(i => i.preparationArea === 'BARISTA') && (
              <Badge variant="secondary" className={`text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 ${
                order.baristaStatus === 'READY' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                order.baristaStatus === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                order.baristaStatus === 'PREPARING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' :
                'bg-muted text-muted-foreground'
              }`}>
                الباريستا: {ORDER_STATUS_MAP[order.baristaStatus]?.label || order.baristaStatus}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground">
            <span className="break-words">{order.customerName}</span>
            {order.customerPhone && <span className="flex items-center gap-1 shrink-0" dir="ltr"><Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />{order.customerPhone}</span>}
          </div>
          <div className="space-y-1 sm:space-y-1.5">
            {order.items.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between text-[11px] sm:text-xs">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded bg-muted text-[8px] sm:text-[10px] font-bold flex-shrink-0">{item.quantity}</span>
                  <span className="break-words leading-snug">{item.mealTitleAr || item.mealTitle}</span>
                </div>
                <span className="text-muted-foreground flex-shrink-0 mr-1 sm:mr-2">{(item.price * item.quantity).toFixed(2)} ج.م</span>
              </div>
            ))}
            {order.items.length > 3 && <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center">+{order.items.length - 3} أصناف أخرى</p>}
          </div>
          <Separator className="bg-border/20" />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">الإجمالي</p>
              <p className={`text-base sm:text-lg font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>{order.total.toFixed(2)} ج.م</p>
            </div>
            {order.status === 'PENDING' && order.type !== 'DINE_IN' ? (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onConfirm(order.id) }} disabled={updatingOrderId === order.id}
                className="gap-1.5 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-8 sm:h-9 px-2.5 sm:px-4 text-[11px] sm:text-sm">
                {updatingOrderId === order.id ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
                تأكيد
              </Button>
            ) : isReady ? (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onMarkAsPaid(order.id) }} disabled={updatingOrderId === order.id}
                className="gap-1.5 bg-green-600 text-white hover:bg-green-500 font-bold h-8 sm:h-9 px-2.5 sm:px-4 text-[11px] sm:text-sm">
                {updatingOrderId === order.id ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <BadgeCheck className="h-3 w-3 sm:h-4 sm:w-4" />}
                تم الدفع
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onViewReceipt(order) }}
                className="gap-1.5 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8 sm:h-9 px-2.5 sm:px-4 text-[11px] sm:text-sm">
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />الفاتورة
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

