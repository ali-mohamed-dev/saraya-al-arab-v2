import { useQuery } from '@tanstack/react-query'
import type { Order } from '@/lib/saraya/types'
import { transformOrder } from '@/lib/saraya/helpers'

async function fetchOrdersByStatuses(statuses: string[], shiftId: string, kitchenAccess?: boolean): Promise<Order[]> {
  const shiftParam = shiftId ? `&shiftId=${shiftId}` : ''
  const accessParam = kitchenAccess !== undefined ? `&kitchenAccess=${kitchenAccess}` : ''
  const results = await Promise.all(
    statuses.map(status =>
      fetch(`/api/orders?status=${status}${shiftParam}${accessParam}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => (Array.isArray(data) ? data : data?.data ?? []).map(transformOrder))
        .catch(() => [] as Order[])
    )
  )
  return results.flat()
}

export function useKitchenOrders(shiftId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['kitchen-orders', shiftId],
    queryFn: () => fetchOrdersByStatuses(['CONFIRMED', 'PREPARING', 'READY'], shiftId, true),
    enabled: enabled && !!shiftId,
    refetchInterval: 5000,
    staleTime: 3000,
  })
}

export function useBaristaOrders(shiftId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['barista-orders', shiftId],
    queryFn: () => fetchOrdersByStatuses(['CONFIRMED', 'PREPARING', 'READY'], shiftId, undefined),
    enabled: enabled && !!shiftId,
    refetchInterval: 5000,
    staleTime: 3000,
  })
}

export function useWaiterOrders(shiftId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['waiter-orders', shiftId],
    queryFn: () => fetchOrdersByStatuses(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY'], shiftId),
    enabled: enabled && !!shiftId,
    refetchInterval: 5000,
    staleTime: 3000,
  })
}

export function useMeals() {
  return useQuery({
    queryKey: ['meals'],
    queryFn: async () => {
      const res = await fetch('/api/meals')
      if (!res.ok) throw new Error('Failed to fetch meals')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}
