'use client'

import { motion } from 'framer-motion'
import { Clock, Flame, CheckCircle, XCircle, Loader2, ChefHat } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Order, KitchenBaristaStatus } from '@/lib/saraya/types'
import { ORDER_TYPE_MAP } from '@/lib/saraya/constants'
import { getRelativeTime, getElapsedMinutes } from '@/lib/saraya/helpers'

// KDS-specific urgency helpers with tighter thresholds for barista
function getUrgencyClasses(createdAt: string): string {
  const mins = getElapsedMinutes(createdAt)
  if (mins > 15) return 'border-red-500 animate-pulse'
  if (mins > 10) return 'border-orange-500'
  if (mins > 5) return 'border-yellow-500'
  return 'border-blue-500/30'
}

function getUrgencyTextColor(createdAt: string): string {
  const mins = getElapsedMinutes(createdAt)
  if (mins > 15) return 'text-red-400'
  if (mins > 10) return 'text-orange-400'
  if (mins > 5) return 'text-yellow-400'
  return 'text-blue-400'
}

function isBaristaItem(item: any) {
  return item?.preparationArea === 'BARISTA' || item?.category === 'مشروبات'
}

interface BaristaOrderCardProps {
  order: Order
  relativeTime: string
  seenAt?: string
  isUpdating: boolean
  onUpdateStatus: (orderId: string, newStatus: KitchenBaristaStatus) => void
}

export function BaristaOrderCard({ order, relativeTime, isUpdating, onUpdateStatus }: BaristaOrderCardProps) {
  const typeInfo = ORDER_TYPE_MAP[order.type]
  const items = order.items.filter(isBaristaItem)
  const urgencyCls = getUrgencyClasses(order.createdAt)
  const urgencyTxt = getUrgencyTextColor(order.createdAt)
  const elapsedMins = Math.max(0, getElapsedMinutes(order.createdAt))

  return (
    <motion.div
      key={order.id}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className={`border-2 ${urgencyCls} bg-card overflow-hidden transition-all`}>
        {/* Card header */}
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-blue-400">#{order.orderNumber}</span>
            <Badge variant="outline" className={`${typeInfo.color} border-current/30 text-[10px]`}>
              {typeInfo.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {relativeTime || getRelativeTime(order.createdAt)}
          </div>
        </div>

        <CardContent className="p-4">
          {/* Table number */}
          {order.type === 'DINE_IN' && order.tableNumber && (
            <div className="mb-3 rounded-lg bg-blue-500/10 p-2 text-center border border-blue-500/20">
              <span className="text-xs text-blue-300 block">طاولة</span>
              <span className="text-3xl font-black text-blue-400">{order.tableNumber}</span>
            </div>
          )}

          {/* مؤشر حالة المطبخ - ليتمكن الباريستا من معرفة جاهزية الطعام */}
          {order.items.some(i => i.preparationArea === 'KITCHEN') && (
            <div className={`mb-3 flex items-center gap-2 rounded-lg p-2 border transition-colors ${
              order.kitchenStatus === 'READY' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
            }`}>
              <ChefHat className="h-4 w-4" />
              <span className="text-[10px] font-bold">
                المطبخ: {order.kitchenStatus === 'READY' ? 'جاهز ✓' : 
                         order.kitchenStatus === 'PREPARING' ? 'قيد التحضير...' : 
                         'في الانتظار...'}
              </span>
            </div>
          )}

          {/* Elapsed time */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className={`h-4 w-4 ${urgencyTxt}`} />
              <span className={`text-sm font-bold ${urgencyTxt}`}>
                {relativeTime || getRelativeTime(order.createdAt)}
              </span>
            </div>
            {elapsedMins > 5 && (
              <Badge variant="outline" className={`text-[10px] ${urgencyTxt} border-current/20`}>
                {elapsedMins} دقيقة
              </Badge>
            )}
          </div>

          {/* Items */}
          <div className="space-y-3 mb-4">
            {items.map((item, idx) => (
              <div 
                key={item.id || idx} 
                className={`flex gap-3 items-start p-2 rounded-lg transition-all ${
                  (item.addedQuantity ?? 0) > 0 ? 'bg-emerald-500/15 border border-emerald-500/30 animate-pulse' : ''
                }`}
              >
                <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/20 text-blue-400 font-bold">
                  {item.quantity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-lg leading-tight">
                      {item.mealTitleAr || item.mealTitle}
                    </p>
                    {(item.addedQuantity ?? 0) > 0 && (
                      <Badge className="bg-emerald-500 text-black font-bold text-[10px]">
                        إضافة +{item.addedQuantity}
                      </Badge>
                    )}
                  </div>
                  {item.addOns && item.addOns.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.addOns.map((a, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-blue-300/70 bg-blue-500/5 px-1.5 rounded"
                        >
                          {a.titleAr || a.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mb-4 p-2 rounded bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200">
              <span className="font-bold block mb-0.5">ملاحظات:</span>
              {order.notes}
            </div>
          )}

          <Separator className="mb-4 opacity-10" />

          {/* Actions */}
          <div className="flex gap-2">
            {(order.baristaStatus === 'PENDING' || order.baristaStatus === 'CONFIRMED') && (
              <Button
                onClick={() => onUpdateStatus(order.id, 'PREPARING')}
                disabled={isUpdating}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold h-12"
              >
                {isUpdating
                  ? <Loader2 className="animate-spin" />
                  : <Flame className="ml-2 h-5 w-5" />
                }
                تحضير المشروبات
              </Button>
            )}
            {order.baristaStatus === 'PREPARING' && (
              <Button
                onClick={() => onUpdateStatus(order.id, 'READY')}
                disabled={isUpdating}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold h-12"
              >
                {isUpdating
                  ? <Loader2 className="animate-spin" />
                  : <CheckCircle className="ml-2 h-5 w-5" />
                }
                مشروبات جاهزة!
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(order.id, 'CANCELLED')}
              className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-12 px-4"
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
