'use client'

import { UtensilsCrossed, ShoppingBag, Truck, Package } from 'lucide-react'

export function getOrderTypeIcon(type: string) {
  switch (type) {
    case 'DINE_IN': return UtensilsCrossed
    case 'TAKEAWAY': return ShoppingBag
    case 'DELIVERY': return Truck
    default: return Package
  }
}

export function getOrderTypeLabel(type: string): string {
  switch (type) {
    case 'DINE_IN': return 'صالة'
    case 'TAKEAWAY': return 'تيكاوي'
    case 'DELIVERY': return 'ديليفري'
    default: return type
  }
}

interface OrderTypeIconProps {
  type: string
  className?: string
}

export function OrderTypeIcon({ type, className }: OrderTypeIconProps) {
  switch (type) {
    case 'DINE_IN': return <UtensilsCrossed className={className} />
    case 'TAKEAWAY': return <ShoppingBag className={className} />
    case 'DELIVERY': return <Truck className={className} />
    default: return <Package className={className} />
  }
}

