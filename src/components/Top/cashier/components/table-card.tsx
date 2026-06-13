'use client'

import { motion } from 'framer-motion'
import { Clock, Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

export { getGroupedTableStatus }

export function TableCard({ tableNumber, orders, onViewReceipt }: TableCardProps) {
  const groupStatus = getGroupedTableStatus(orders)
  const statusInfo = ORDER_STATUS_MAP[groupStatus]
  const total = orders.reduce((sum, order) => sum + order.total, 0)
  const isReady = groupStatus === 'READY_TO_PAY'

  return (
    <motion.div key={`table-${tableNumber}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} layout>
      <Card
        className={`border overflow-hidden cursor-pointer transition-all duration-200 ${isReady ? 'border-green-500/50 hover:border-green-400/70 bg-green-500/5' : 'border-border/50 hover:border-[#D4AF37]/40 bg-card'}`}
        onClick={() => onViewReceipt(orders)}
        dir="rtl"
      >
        <div className={`h-1 ${isReady ? 'bg-gradient-to-l from-green-500 to-green-400/40' : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/40'}`} />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isReady ? 'bg-green-500/10' : 'bg-[#D4AF37]/10'}`}>
                <span className={`text-sm font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>طاولة {tableNumber}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusInfo?.bg || ''}`}>
                    <span className={statusInfo?.color || ''}>{statusInfo?.label || groupStatus}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#D4AF37]">
                    طلبات {orders.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">أحدث طلب {getRelativeTime(orders[0].createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            {orders.slice(0, 2).map((order) => {
              const displayStatus = getCashierDisplayStatus(order)
              return (
                <div key={order.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold flex-shrink-0">#{order.orderNumber}</span>
                    <span className="truncate">{displayStatus.label}</span>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">{order.total.toFixed(2)} ج.م</span>
                </div>
              )
            })}
            {orders.length > 2 && <p className="text-[10px] text-muted-foreground text-center">+{orders.length - 2} طلبات إضافية</p>}
          </div>
          <Separator className="bg-border/20" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground">الإجمالي كله</p>
              <p className={`text-lg font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>{total.toFixed(2)} ج.م</p>
            </div>
            <Button size="sm" variant={isReady ? 'default' : 'outline'} className="gap-2 h-9 px-4"
              onClick={(e) => { e.stopPropagation(); onViewReceipt(orders) }}>
              <Receipt className="h-4 w-4" />عرض الفاتورة
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

