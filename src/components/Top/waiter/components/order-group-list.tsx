'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ClipboardList, Phone, Hash } from 'lucide-react'
import { OrderCard } from './order-card'
import type { Order } from '@/lib/saraya/types'

interface OrderGroupListProps {
  orders: Order[]
  loadingOrders: boolean
  updatingOrderId: string | null
  onConfirmOrder: (orderId: string) => void
  onConfirmAdditions: (orderId: string) => void
  onViewDetails: (order: Order) => void
  onAddItems?: (order: Order) => void
}

export function OrderGroupList({
  orders,
  loadingOrders,
  updatingOrderId,
  onConfirmOrder,
  onConfirmAdditions,
  onViewDetails,
  onAddItems,
}: OrderGroupListProps) {
  const { groupedOrders, sortedGroups } = useMemo(() => {
    const grouped = orders.reduce<Record<string, Order[]>>((acc, order) => {
      const key =
        order.type === 'DINE_IN' && order.tableNumber
          ? `طاولة ${order.tableNumber}`
          : 'بدون طاولة'
      if (!acc[key]) acc[key] = []
      acc[key].push(order)
      return acc
    }, {})

    const sorted = Object.entries(grouped).sort(([a], [b]) => {
      if (a === 'بدون طاولة') return 1
      if (b === 'بدون طاولة') return -1
      const numA = parseInt(a.replace('طاولة ', ''))
      const numB = parseInt(b.replace('طاولة ', ''))
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a.localeCompare(b, 'ar')
    })

    return { groupedOrders: grouped, sortedGroups: sorted }
  }, [orders])

  if (loadingOrders) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/30 bg-card p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-2.5 w-14 rounded bg-muted" />
              </div>
            </div>
            <div className="h-2.5 w-full rounded bg-muted" />
            <div className="h-2.5 w-3/4 rounded bg-muted" />
            <div className="h-2.5 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="h-10 w-10 text-muted-foreground/20" />
        </div>
        <p className="text-base font-bold text-muted-foreground mb-1">لا توجد طلبات نشطة</p>
        <p className="text-sm text-muted-foreground/60">سيتم تحديث القائمة تلقائياً</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {sortedGroups.map(([groupName, groupOrders]) => (
          <motion.div
            key={groupName}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {/* Group header */}
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/10">
                {groupName === 'بدون طاولة' ? (
                  <Phone className="h-4 w-4 text-[#D4AF37]" />
                ) : (
                  <Hash className="h-4 w-4 text-[#D4AF37]" />
                )}
              </div>
              <h3 className="font-bold text-[#D4AF37]">{groupName}</h3>
              <span className="flex h-5 items-center rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-1.5 text-[10px] font-bold text-[#D4AF37]">
                {groupOrders.length} طلب
              </span>
            </div>

            {/* Order cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {groupOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    updatingOrderId={updatingOrderId}
                    onConfirm={() => onConfirmOrder(order.id)}
                    onConfirmAdditions={() => onConfirmAdditions(order.id)}
                    onViewDetails={() => onViewDetails(order)}
                    onAddItems={onAddItems ? () => onAddItems(order) : undefined}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
