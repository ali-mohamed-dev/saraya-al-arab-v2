'use client'

import { motion } from 'framer-motion'
import { X, Eye, Printer } from 'lucide-react'
import { ORDER_TYPE_MAP } from '@/lib/saraya/constants'
import { formatTime } from '@/lib/saraya/helpers'
import type { Order } from '@/lib/saraya/types'

interface CancelledOrdersProps {
  orders: Order[]
  onViewReceipt?: (order: Order) => void
  onPrint?: (order: Order) => void
}

export function CancelledOrders({ orders, onViewReceipt, onPrint }: CancelledOrdersProps) {
  if (orders.length === 0) return (
    <div className="py-16 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="w-20 h-20 rounded-2xl bg-red-500/5 flex items-center justify-center mx-auto mb-4">
          <X className="h-10 w-10 text-red-400/20" />
        </div>
        <p className="text-base font-bold text-muted-foreground mb-1">لا توجد طلبات ملغية</p>
        <p className="text-sm text-muted-foreground/60">سيتم عرض الطلبات الملغية هنا</p>
      </motion.div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
      {orders.map((order, i) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-red-500/15 bg-red-500/5 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <X className="h-3.5 w-3.5 text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">#{order.orderNumber}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {ORDER_TYPE_MAP[order.type]?.label ?? order.type}
                  {order.tableNumber && ` · طاولة ${order.tableNumber}`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-red-400">{order.total.toFixed(2)} ج.م</p>
              <p className="text-[9px] text-muted-foreground">{formatTime(order.updatedAt)}</p>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            {order.customerName && <span>{order.customerName} · </span>}
            {order.customerPhone && <span dir="ltr">{order.customerPhone}</span>}
            {order.cancelledBy && <span className="text-red-300 mr-1">— {order.cancelledBy}</span>}
          </div>
          {(onViewReceipt || onPrint) && (
            <div className="mt-2 pt-2 border-t border-red-500/10 flex items-center gap-1.5">
              {onViewReceipt && (
                <button onClick={() => onViewReceipt(order)}
                  className="h-7 px-2.5 rounded-lg border border-slate-500/15 text-slate-400 hover:bg-slate-500/10 text-[9px] font-medium transition-all flex items-center gap-1">
                  <Eye className="h-3 w-3" /> فاتورة
                </button>
              )}
              {onPrint && (
                <button onClick={() => onPrint(order)}
                  className="h-7 px-2.5 rounded-lg border border-slate-500/15 text-slate-400 hover:bg-slate-500/10 text-[9px] font-medium transition-all flex items-center gap-1">
                  <Printer className="h-3 w-3" /> طباعة
                </button>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
