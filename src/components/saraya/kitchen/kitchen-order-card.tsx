'use client'

import { motion } from 'framer-motion'
import { Clock, Utensils, Phone, Package, Flame, CheckCircle, XCircle, Loader2, AlertTriangle, Coffee } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Order, KitchenBaristaStatus } from '@/lib/saraya/types'
import { ORDER_STATUS_MAP, ORDER_TYPE_MAP } from '@/lib/saraya/constants'
import { getRelativeTime, getElapsedMinutes } from '@/lib/saraya/helpers'

// KDS-specific urgency helpers with tighter thresholds
function getUrgencyClasses(createdAt: string): string {
  const mins = getElapsedMinutes(createdAt)
  if (mins > 15) return 'border-red-500 animate-pulse'
  if (mins > 10) return 'border-orange-500'
  if (mins > 5) return 'border-yellow-500'
  return 'border-border/50'
}

function getUrgencyTextColor(createdAt: string): string {
  const mins = getElapsedMinutes(createdAt)
  if (mins > 15) return 'text-red-400'
  if (mins > 10) return 'text-orange-400'
  if (mins > 5) return 'text-yellow-400'
  return 'text-muted-foreground'
}

function getOrderTypeIcon(type: string) {
  switch (type) {
    case 'DINE_IN': return <Utensils className="h-4 w-4" />
    case 'TAKEAWAY': return <Package className="h-4 w-4" />
    case 'DELIVERY': return <Phone className="h-4 w-4" />
    default: return null
  }
}

function isKitchenItem(item: { preparationArea: string }) {
  return item.preparationArea === 'KITCHEN'
}

interface NextAction {
  nextSubStatus: KitchenBaristaStatus
  label: string
  color: string
  icon: React.ReactNode
}

function getNextAction(order: Order): NextAction | null {
  switch (order.kitchenStatus) {
    case 'PENDING':
    case 'CONFIRMED':
      return { nextSubStatus: 'PREPARING', label: 'بدء التحضير', color: 'bg-blue-600 hover:bg-blue-500 text-white', icon: <Flame className="h-5 w-5" /> }
    case 'PREPARING':
      return { nextSubStatus: 'READY', label: 'جاهز للاستلام', color: 'bg-green-600 hover:bg-green-500 text-white', icon: <CheckCircle className="h-5 w-5" /> }
    default:
      return { nextSubStatus: 'READY', label: 'جاهز للاستلام', color: 'bg-green-600 hover:bg-green-500 text-white', icon: <CheckCircle className="h-5 w-5" /> }
  }
}

interface KitchenOrderCardProps {
  order: Order
  relativeTime: string
  isUpdating: boolean
  onUpdateStatus: (orderId: string, newStatus: KitchenBaristaStatus) => void
}

export function KitchenOrderCard({ order, relativeTime, isUpdating, onUpdateStatus }: KitchenOrderCardProps) {
  const statusInfo = ORDER_STATUS_MAP[order.status]
  const typeInfo = ORDER_TYPE_MAP[order.type]
  const nextAction = getNextAction(order)
  const urgencyClasses = getUrgencyClasses(order.createdAt)
  const urgencyTextColor = getUrgencyTextColor(order.createdAt)
  const elapsedMins = getElapsedMinutes(order.createdAt)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      <Card className={`border-2 ${urgencyClasses} bg-card overflow-hidden transition-all`}>
        {/* Card Header: Order # + Type + Status */}
        <div className={`${statusInfo.bg} border-b border-border/30 px-3 py-2 md:px-4 md:py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xl md:text-2xl font-black ${statusInfo.color}`}>
                #{order.orderNumber}
              </span>
              <Badge variant="outline" className={`${typeInfo.color} border-current/30 text-xs md:text-sm gap-1`}>
                {getOrderTypeIcon(order.type)}
                {typeInfo.label}
              </Badge>
            </div>
            <Badge className={`${statusInfo.bg} ${statusInfo.color} border text-xs md:text-sm font-bold`}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Table Number (prominent for DINE_IN) */}
          {order.type === 'DINE_IN' && order.tableNumber && (
            <div className="mt-2 flex items-center gap-1.5">
              <Utensils className="h-4 w-4 text-blue-400" />
              <span className="text-base md:text-lg font-bold text-blue-400">
                طاولة {order.tableNumber}
              </span>
            </div>
          )}

          {/* Delivery Address */}
          {order.type === 'DELIVERY' && order.deliveryAddress && (
            <div className="mt-1 text-xs text-purple-400/80 truncate">
              {order.deliveryAddress}
            </div>
          )}
        </div>

        {/* Card Body: Items + Timer */}
        <CardContent className="p-3 md:p-4">
          {/* Elapsed Time - KDS style large display */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className={`h-4 w-4 ${urgencyTextColor}`} />
              <span className={`text-sm md:text-base font-bold ${urgencyTextColor}`}>
                {relativeTime || getRelativeTime(order.createdAt)}
              </span>
            </div>
            {elapsedMins > 5 && (
              <span className={`text-xs font-bold ${urgencyTextColor} bg-background/50 rounded px-1.5 py-0.5`}>
                {elapsedMins} د
              </span>
            )}
          </div>

          {/* Items List - Large text for kitchen readability */}
          <div className="space-y-1.5 mb-3">
            {order.items.filter(isKitchenItem).map((item, idx) => {
              const isNewItem = (item.addedQuantity ?? 0) > 0
              return (
                <div 
                  key={item.id || idx} 
                  className={`flex items-start gap-2 p-1.5 rounded-lg transition-all ${
                    isNewItem ? 'bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)] animate-pulse' : ''
                  }`}
                >
                  <span className="flex-shrink-0 flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-md bg-[#D4AF37]/10 text-xs md:text-sm font-black text-[#D4AF37]">
                    {item.quantity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm md:text-base font-semibold leading-tight truncate">
                        {item.mealTitleAr || item.mealTitle}
                      </p>
                      {(item.addedQuantity ?? 0) > 0 && (
                        <span className="rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] md:text-xs font-semibold px-2 py-0.5">
                          +{item.addedQuantity}
                        </span>
                      )}
                      {isNewItem && (
                        <span className="rounded-full bg-green-500/10 text-green-400 text-[10px] md:text-xs font-semibold px-2 py-0.5">
                          جديد
                        </span>
                      )}
                    </div>
                    {item.addOns && item.addOns.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {item.addOns.map((addon, aIdx) => (
                          <span key={aIdx} className="text-[10px] md:text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                            {addon.titleAr || addon.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {order.items.some((item) => item.preparationArea === 'BARISTA') && (
              <div className={`mt-2 flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                order.baristaStatus === 'READY' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                <Coffee className="h-4 w-4" />
                <span className="text-[11px] font-bold">
                  الباريستا: {order.baristaStatus === 'READY' ? 'جاهز ✓' : 
                            order.baristaStatus === 'PREPARING' ? 'قيد التحضير...' : 
                            'في الانتظار...'}
                </span>
              </div>
            )}
          </div>

          {/* Notes - highlighted for kitchen attention */}
          {order.notes && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 md:p-2.5">
              <div className="flex items-center gap-1 mb-0.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] md:text-xs font-bold text-amber-400">ملاحظات</span>
              </div>
              <p className="text-xs md:text-sm text-amber-200/90 leading-relaxed">{order.notes}</p>
            </div>
          )}

          <Separator className="my-2 bg-border/30" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-2">
            {nextAction && (
              <Button
                onClick={() => onUpdateStatus(order.id, nextAction.nextSubStatus)}
                disabled={isUpdating}
                className={`flex-1 gap-2 h-10 md:h-12 text-sm md:text-base font-bold rounded-lg ${nextAction.color} transition-all active:scale-95`}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  nextAction.icon
                )}
                {nextAction.label}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(order.id, 'CANCELLED')}
              className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-10 md:h-12 px-3 md:px-4 text-sm"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden md:inline">إلغاء</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
