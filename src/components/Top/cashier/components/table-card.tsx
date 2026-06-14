'use client'

import { motion } from 'framer-motion'
import { Clock, Receipt, Utensils } from 'lucide-react'
import type { Order } from '@/lib/saraya/types'
import { ORDER_STATUS_MAP } from '@/lib/saraya/constants'
import { getRelativeTime } from '@/lib/saraya/helpers'

interface TableCardProps {
  tableNumber: string
  orders: Order[]
  onViewReceipt: (orders: Order[]) => void
}

function getGroupedTableStatus(orders: Order[]) {
  if (orders.some((o) => o.status === 'READY_TO_PAY')) return 'READY_TO_PAY'
  const dineInOnly = orders.every((o) => o.type === 'DINE_IN')
  if (dineInOnly) {
    if (orders.some((o) => o.status === 'PREPARING')) return 'PREPARING'
    if (orders.some((o) => o.status === 'CONFIRMED')) return 'CONFIRMED'
    if (orders.some((o) => o.status === 'READY')) return 'PREPARING'
    return 'PENDING'
  }
  if (orders.some((o) => o.status === 'READY')) return 'READY'
  if (orders.some((o) => o.status === 'PREPARING')) return 'PREPARING'
  if (orders.some((o) => o.status === 'CONFIRMED')) return 'CONFIRMED'
  return 'PENDING'
}

export { getGroupedTableStatus }

export function TableCard({ tableNumber, orders, onViewReceipt }: TableCardProps) {
  const groupStatus = getGroupedTableStatus(orders)
  const statusInfo = ORDER_STATUS_MAP[groupStatus]
  const total = orders.reduce((sum, order) => sum + order.total, 0)
  const isReady = groupStatus === 'READY_TO_PAY'

  return (
    <motion.div
      key={`table-${tableNumber}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      layout
    >
      <div
        onClick={() => onViewReceipt(orders)}
        className={`relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 ${
          isReady
            ? 'border-green-500/40 hover:border-green-400/60 bg-gradient-to-br from-green-500/[0.04] to-transparent'
            : 'border-border/60 hover:border-[#D4AF37]/30 bg-card hover:bg-muted/20'
        }`}
        dir="rtl"
      >
        <div className={`h-0.5 w-full ${isReady ? 'bg-gradient-to-l from-green-500 to-green-400/30' : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/20'}`} />
        <div className="p-3 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                isReady ? 'bg-green-500/15 text-green-400' : 'bg-[#D4AF37]/15 text-[#D4AF37]'
              }`}>
                <Utensils className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">طاولة {tableNumber}</span>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${statusInfo?.bg || ''}`}>
                    <span className={statusInfo?.color || ''}>{statusInfo?.label || groupStatus}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                  <span className="text-[9px] text-muted-foreground/60">
                    {orders.length} طلبات · {getRelativeTime(orders[0].createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Orders summary */}
          <div className="space-y-1">
            {orders.slice(0, 2).map((order) => (
              <div key={order.id} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[9px] font-bold flex-shrink-0">#{order.orderNumber}</span>
                  <span className="truncate text-muted-foreground">{order.items.length} أصناف</span>
                </div>
                <span className="text-muted-foreground flex-shrink-0">{order.total.toFixed(0)} ج.م</span>
              </div>
            ))}
            {orders.length > 2 && (
              <p className="text-[9px] text-muted-foreground text-center pt-0.5">+{orders.length - 2} طلبات إضافية</p>
            )}
          </div>

          {/* Divider + Total */}
          <div className="border-t border-border/20 pt-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground">الإجمالي</p>
                <p className={`text-base font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>{total.toFixed(2)} ج.م</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onViewReceipt(orders) }}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-medium transition-all ${
                  isReady
                    ? 'bg-green-600 text-white hover:bg-green-500'
                    : 'border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10'
                }`}>
                <Receipt className="h-3 w-3" />عرض الفاتورة
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
