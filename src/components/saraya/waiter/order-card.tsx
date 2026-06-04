'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Timer, Eye, ChevronDown, ChevronUp, Check, Hash, Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_MAP, ORDER_TYPE_MAP } from '@/lib/saraya/constants'
import { getRelativeTime } from '@/lib/saraya/helpers'
import type { Order } from '@/lib/saraya/types'

interface OrderCardProps {
  order: Order
  updatingOrderId: string | null
  onConfirm: () => void
  onViewDetails: () => void
}

export function OrderCard({
  order,
  updatingOrderId,
  onConfirm,
  onViewDetails,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false)
  const statusInfo = ORDER_STATUS_MAP[order.status]
  const typeInfo = ORDER_TYPE_MAP[order.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`border ${statusInfo?.bg || 'border-border/50'} bg-card overflow-hidden`}>
        <CardContent className="p-4">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#D4AF37]">#{order.orderNumber}</span>
              <Badge className={`${statusInfo?.bg} ${statusInfo?.color} border text-[10px]`}>
                {statusInfo?.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              <RelativeTimeText dateStr={order.createdAt} />
            </div>
          </div>

          {/* Type & table */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-semibold ${typeInfo?.color}`}>
              {typeInfo?.label}
            </span>
            {order.tableNumber && (
              <>
                <span className="text-border">•</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  طاولة {order.tableNumber}
                </span>
              </>
            )}
          </div>

          {/* Items preview */}
          <div className="space-y-1.5">
            {(expanded ? order.items : order.items.slice(0, 3)).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="bg-[#D4AF37]/10 text-[#D4AF37] rounded px-1.5 py-0.5 text-[10px] font-bold flex-shrink-0">
                    {item.quantity}×
                  </span>
                  <span className="truncate text-xs">{item.mealTitleAr || item.mealTitle}</span>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">
                  {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            {order.items.length > 3 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <ChevronDown className="h-3 w-3" />
                +{order.items.length - 3} أصناف أخرى
              </button>
            )}
            {expanded && order.items.length > 3 && (
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <ChevronUp className="h-3 w-3" />
                عرض أقل
              </button>
            )}
          </div>

          {/* Notes indicator */}
          {order.notes && (
            <div className="mt-2 rounded border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2 py-1 text-[10px] text-[#D4AF37] truncate">
              📝 {order.notes}
            </div>
          )}

          {/* Bottom row */}
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/30">
            <span className="font-bold text-[#D4AF37]">{order.total.toFixed(2)} ج.م</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onViewDetails}
                className="gap-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8 px-3 text-xs"
              >
                <Eye className="h-3 w-3" />
                التفاصيل
              </Button>
              {order.status === 'PENDING' && (
                <Button
                  size="sm"
                  onClick={onConfirm}
                  disabled={updatingOrderId === order.id}
                  className="gap-1 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 h-8 px-3 text-xs"
                >
                  {updatingOrderId === order.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
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
