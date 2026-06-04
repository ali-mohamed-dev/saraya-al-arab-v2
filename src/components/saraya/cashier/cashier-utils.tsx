'use client'

import { Utensils, Phone, Package, ClipboardList } from 'lucide-react'

export function getOrderTypeIcon(type: string) {
  switch (type) {
    case 'DINE_IN': return <Utensils className="h-3.5 w-3.5" />
    case 'TAKEAWAY': return <Package className="h-3.5 w-3.5" />
    case 'DELIVERY': return <Phone className="h-3.5 w-3.5" />
    default: return <ClipboardList className="h-3.5 w-3.5" />
  }
}
