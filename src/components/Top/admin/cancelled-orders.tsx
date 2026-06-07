'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ORDER_STATUS_MAP, ORDER_TYPE_MAP } from '@/lib/saraya/constants'
import type { Order } from '@/lib/saraya/types'
import { formatTime } from '@/lib/saraya/helpers'

interface CancelledOrdersProps {
  orders: Order[]
}

export function CancelledOrders({ orders }: CancelledOrdersProps) {
  if (orders.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">الطلبات الملغية</h3>
          <p className="text-xs text-muted-foreground">تظهر هنا الطلبات التي تم إلغاؤها من قبل الأدمن مع اسم المستخدم.</p>
        </div>
        <Badge variant="outline" className="text-red-400 border-red-500/30">
          {orders.length} ملغي
        </Badge>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {orders.map((order) => (
          <Card key={order.id} className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">طلب #{order.orderNumber}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {ORDER_TYPE_MAP[order.type]?.label ?? order.type} • {ORDER_STATUS_MAP[order.status]?.label ?? order.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-400">{order.total.toFixed(2)} ج.م</p>
                  <p className="text-[11px] text-muted-foreground">{formatTime(order.updatedAt)}</p>
                </div>
              </div>
              <div className="mt-3 text-[12px] text-muted-foreground">
                <p>الزبون: {order.customerName || 'غير محدد'}</p>
                {order.customerPhone && <p>الهاتف: {order.customerPhone}</p>}
                {order.tableNumber && <p>طاولة: {order.tableNumber}</p>}
                {order.cancelledBy && <p className="text-red-300">ملغي بواسطة: {order.cancelledBy}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
