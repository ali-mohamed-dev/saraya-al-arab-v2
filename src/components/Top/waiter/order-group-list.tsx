'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ClipboardList, Phone, Hash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { OrderCard } from './order-card'
import type { Order } from '@/lib/saraya/types'

interface OrderGroupListProps {
  orders: Order[]
  loadingOrders: boolean
  updatingOrderId: string | null
  onConfirmOrder: (orderId: string) => void
  onConfirmAdditions: (orderId: string) => void
  onViewDetails: (order: Order) => void
}

export function OrderGroupList({
  orders,
  loadingOrders,
  updatingOrderId,
  onConfirmOrder,
  onConfirmAdditions,
  onViewDetails,
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
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
          <p className="text-sm text-muted-foreground">جاري تحميل الطلبات...</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-20 text-center"
      >
        <ClipboardList className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
        <p className="text-lg text-muted-foreground">لا توجد طلبات نشطة حالياً</p>
        <p className="text-sm text-muted-foreground/60 mt-1">سيتم تحديث القائمة تلقائياً</p>
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
              <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] text-xs">
                {groupOrders.length} طلب
              </Badge>
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

