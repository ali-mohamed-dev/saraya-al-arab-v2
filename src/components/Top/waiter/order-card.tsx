'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Clock, Eye, Check, Loader2, Utensils, Package, Phone, 
  Flame, Coffee, Timer, Hash, ChevronDown, ChevronUp, AlertCircle, Send
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ORDER_STATUS_MAP } from '@/lib/saraya/constants'
import { getRelativeTime } from '@/lib/saraya/helpers'
import type { Order } from '@/lib/saraya/types'

const ORDER_TYPE_MAP_WITH_ICONS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DINE_IN: { label: 'صالة', icon: <Utensils className="h-3.5 w-3.5" />, color: 'text-blue-400' },
  TAKEAWAY: { label: 'تيكاوي', icon: <Package className="h-3.5 w-3.5" />, color: 'text-orange-400' },
  DELIVERY: { label: 'ديليفري', icon: <Phone className="h-3.5 w-3.5" />, color: 'text-purple-400' },
}

interface OrderCardProps {
  order: Order
  updatingOrderId: string | null
  onConfirm: () => void
  onConfirmAdditions?: () => void
  onViewDetails: () => void
}

export function OrderCard({
  order,
  updatingOrderId,
  onConfirm,
  onConfirmAdditions,
  onViewDetails,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false)
  const statusInfo = ORDER_STATUS_MAP[order.status] ?? ORDER_STATUS_MAP.PENDING
  const typeInfo = ORDER_TYPE_MAP_WITH_ICONS[order.type] ?? ORDER_TYPE_MAP_WITH_ICONS.DINE_IN
  const isReady = order.status === 'READY'
  const hasUnconfirmedAdditions = !order.kitchenAccess && order.status !== 'PENDING'

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card
        className={`border overflow-hidden transition-all duration-200 ${
          hasUnconfirmedAdditions
            ? 'border-amber-500/50 bg-amber-500/5'
            : isReady
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-border/50 bg-card'
        }`}
        dir="rtl"
      >
        <div className={`h-1 ${
          hasUnconfirmedAdditions 
            ? 'bg-gradient-to-l from-amber-500 to-amber-400/40' 
            : isReady 
            ? 'bg-gradient-to-l from-green-500 to-green-400/40' 
            : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/40'
        }`} />
        <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg ${isReady ? 'bg-green-500/10' : 'bg-[#D4AF37]/10'}`}>
                <span className={`text-[10px] sm:text-sm font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>
                  #{order.orderNumber}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium ${statusInfo.bg}`}>
                    <span className={statusInfo.color}>{statusInfo.label}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium ${typeInfo.color}`}>
                    {typeInfo.icon}{typeInfo.label}
                  </span>
                  {!order.kitchenAccess && order.status !== 'PENDING' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] sm:text-[10px] font-medium text-amber-400 animate-pulse">
                      <AlertCircle className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> إضافات
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                    <RelativeTimeText dateStr={order.createdAt} />
                  </div>
                </div>
              </div>
            </div>
            {order.tableNumber && (
              <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[9px] sm:text-[10px] gap-1 shrink-0">
                <Utensils className="h-2 w-2 sm:h-2.5 sm:w-2.5" />طاولة {order.tableNumber}
              </Badge>
            )}
          </div>

          {/* Items Preview */}
          <div className="space-y-1 sm:space-y-1.5">
            {(expanded ? order.items : order.items.slice(0, 3)).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] sm:text-sm gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded bg-muted text-[8px] sm:text-[10px] font-bold flex-shrink-0">
                    {item.quantity}
                  </span>
                  <span className="break-words text-[11px] sm:text-xs font-medium leading-snug">{item.mealTitleAr || item.mealTitle}</span>
                </div>
                <span className="text-[11px] sm:text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                  {(item.price * item.quantity).toFixed(2)} ج.م
                </span>
              </div>
            ))}
            {order.items.length > 3 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[11px] sm:text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                +{order.items.length - 3} أصناف أخرى
              </button>
            )}
            {expanded && order.items.length > 3 && (
              <button
                onClick={() => setExpanded(false)}
                className="text-[11px] sm:text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <ChevronUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                عرض أقل
              </button>
            )}
          </div>

          {/* Kitchen & Barista Statuses */}
          {(order.kitchenStatus || order.baristaStatus) && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              {order.items.some(i => i.preparationArea === 'KITCHEN') && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] sm:text-[9px] font-medium ${
                  order.kitchenStatus === 'READY' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                  order.kitchenStatus === 'PREPARING' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                  'border-orange-500/30 bg-orange-500/10 text-orange-400'
                }`}>
                  <Flame className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> مطبخ: {order.kitchenStatus === 'READY' ? 'جاهز' : order.kitchenStatus === 'PREPARING' ? 'يحضر' : 'ينتظر'}
                </span>
              )}
              {order.items.some(i => i.preparationArea === 'BARISTA') && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] sm:text-[9px] font-medium ${
                  order.baristaStatus === 'READY' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                  order.baristaStatus === 'PREPARING' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                  'border-blue-500/30 bg-blue-500/10 text-blue-400'
                }`}>
                  <Coffee className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> باريستا: {order.baristaStatus === 'READY' ? 'جاهز' : order.baristaStatus === 'PREPARING' ? 'يحضر' : 'ينتظر'}
                </span>
              )}
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[9px] sm:text-[10px] text-amber-400 break-words">
              ⚠️ {order.notes}
            </div>
          )}

          <Separator className="bg-border/20" />

          {/* إضافات بحاجة لتأكيد الويتر */}
          {!order.kitchenAccess && order.status !== 'PENDING' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 sm:p-2.5 space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-1.5 sm:gap-2 text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold">إضافات جديدة بحاجة لتأكيدك</span>
              </div>
              <Button
                size="sm"
                onClick={onConfirmAdditions}
                disabled={updatingOrderId === order.id}
                className="w-full gap-1.5 bg-amber-600 text-white hover:bg-amber-700 h-8 sm:h-9 text-[11px] sm:text-xs font-bold"
              >
                {updatingOrderId === order.id ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                تأكيد وإرسال للمطبخ
              </Button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">الإجمالي</p>
              <p className={`text-base sm:text-lg font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>
                {order.total.toFixed(2)} ج.م
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={onViewDetails}
                className="gap-1 border-slate-500/30 text-slate-400 hover:bg-slate-500/10 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-bold"
              >
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">التفاصيل</span>
              </Button>
              {order.status === 'PENDING' && (
                <Button
                  size="sm"
                  onClick={onConfirm}
                  disabled={updatingOrderId === order.id}
                  className="gap-1 bg-green-600 text-white hover:bg-green-700 h-7 sm:h-8 px-2.5 sm:px-4 text-[10px] sm:text-xs font-bold"
                >
                  {updatingOrderId === order.id ? (
                    <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  )}
                  تأكيد
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Inline RelativeTime that self-updates ──────────────────────────────────
function RelativeTimeText({ dateStr }: { dateStr: string }) {
  const [text, setText] = useState(() => getRelativeTime(dateStr))

  // Re-compute every 30s (lighter than the old timeKey hack which re-rendered the whole page)
  useEffect(() => {
    const id = setInterval(() => setText(getRelativeTime(dateStr)), 30000)
    return () => clearInterval(id)
  }, [dateStr])

  return <span>{text}</span>
}
