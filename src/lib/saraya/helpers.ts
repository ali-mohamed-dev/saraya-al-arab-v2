import type { Order } from './types'

// ── Time helpers ──────────────────────────────────────────────────────────

export function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, Math.floor((now - then) / 1000))

  if (diff < 60) return `منذ ${diff} ثانية`
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`
  return `منذ ${Math.floor(diff / 86400)} يوم`
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function getElapsedMinutes(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

// ── Urgency helpers ──────────────────────────────────────────────────────

export function getUrgencyClasses(minutes: number): string {
  if (minutes > 30) return 'border-red-500/60 bg-red-500/5 animate-pulse'
  if (minutes > 20) return 'border-red-500/40 bg-red-500/5'
  if (minutes > 10) return 'border-amber-500/40 bg-amber-500/5'
  return 'border-border/50 bg-card'
}

export function getUrgencyTextColor(minutes: number): string {
  if (minutes > 30) return 'text-red-400'
  if (minutes > 20) return 'text-red-400'
  if (minutes > 10) return 'text-amber-400'
  return 'text-muted-foreground'
}

// ── Transform raw API data to frontend types ─────────────────────────────

export function transformOrder(raw: Record<string, unknown>): Order {
  const items = (raw.items as Array<Record<string, unknown>> | undefined) ?? []
  return {
    id: (raw.id as string) || '',
    orderNumber: (raw.orderNumber as number) ?? 0,
    type: (raw.type as string) as Order['type'],
    status: (raw.status as string) as Order['status'],
    customerName: (raw.customerName as string) || '',
    customerPhone: (raw.customerPhone as string) || '',
    deliveryAddress: (raw.deliveryAddress as string) || undefined,
    tableNumber: (raw.tableNumber as string) || undefined,
    subtotal: Number(raw.subtotal ?? 0),
    serviceCharge: Number(raw.serviceCharge ?? 0),
    total: Number(raw.total ?? 0),
    kitchenAccess: (raw.kitchenAccess as boolean) ?? false,
    kitchenStatus: (raw.kitchenStatus as string) as Order['kitchenStatus'] || 'PENDING',
    baristaStatus: (raw.baristaStatus as string) as Order['baristaStatus'] || 'PENDING',
    notes: (raw.notes as string) || undefined,
    cancelledBy: (raw.cancelledBy as string) || undefined,
    shiftId: (raw.shiftId as string) || undefined,
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) || new Date().toISOString(),
    items: items.map((item) => {
      let parsedAddOns: { title: string; titleAr: string; price: number }[] | undefined
      try {
        parsedAddOns = typeof item.addOns === 'string'
          ? JSON.parse(item.addOns || '[]')
          : (item.addOns as { title: string; titleAr: string; price: number }[] | undefined)
      } catch {
        parsedAddOns = undefined
      }
      return {
        id: (item.id as string) || '',
        mealId: (item.mealId as string) || '',
        mealTitle: (item.mealTitle as string) || '',
        mealTitleAr: (item.mealTitleAr as string) || '',
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
        preparationArea: (item.preparationArea as string) || 'KITCHEN',
        imageUrl: (item.imageUrl as string) || undefined,
        addOns: parsedAddOns,
        addedQuantity: (item.addedQuantity as number) ?? 0,
      }
    }),
  }
}

// ── Phone validation ─────────────────────────────────────────────────────

export function isValidEgyptianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-]/g, '')
  return /^01[0-9]{9}$/.test(cleaned)
}

// ── HTML escape for print ────────────────────────────────────────────────

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Notification sound ───────────────────────────────────────────────────

let audioContextSingleton: AudioContext | null = null

export function playNotificationSound() {
  try {
    if (!audioContextSingleton) {
      audioContextSingleton = new AudioContext()
    }
    const ctx = audioContextSingleton
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3
    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch { /* ignore */ }
}

// ── Number validation ────────────────────────────────────────────────────

export function isValidNumber(value: string): boolean {
  const num = parseFloat(value)
  return !isNaN(num) && isFinite(num)
}

export function safeParseFloat(value: string, fallback = 0): number {
  const num = parseFloat(value)
  return isNaN(num) || !isFinite(num) ? fallback : num
}
