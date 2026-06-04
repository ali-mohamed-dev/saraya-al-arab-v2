// ─── Rate Limiting & Anti-Spam Protection ─────────────────────
// In-memory store for rate limiting (resets on server restart, which is fine)
// For production with multiple instances, use Redis instead

interface RateLimitEntry {
  count: number
  firstAttempt: number
  lastAttempt: number
}

interface PhoneLimitEntry {
  orderCount: number
  lastOrderTime: number
}

// ─── IP Rate Limiting ──────────────────────────────────────────
const ipStore = new Map<string, RateLimitEntry>()

// Max 5 orders per IP per hour
const IP_MAX_ORDERS = 5
const IP_WINDOW_MS = 60 * 60 * 1000 // 1 hour

export function checkIpRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const entry = ipStore.get(ip)

  if (!entry || now - entry.firstAttempt > IP_WINDOW_MS) {
    // Reset window
    ipStore.set(ip, { count: 1, firstAttempt: now, lastAttempt: now })
    return { allowed: true }
  }

  if (entry.count >= IP_MAX_ORDERS) {
    const retryAfterMs = IP_WINDOW_MS - (now - entry.firstAttempt)
    return { allowed: false, retryAfterMs }
  }

  entry.count++
  entry.lastAttempt = now
  return { allowed: true }
}

// ─── Phone Number Limiting ─────────────────────────────────────
const phoneStore = new Map<string, PhoneLimitEntry>()

// Max 3 active orders per phone number
const PHONE_MAX_ACTIVE_ORDERS = 3
// Minimum 2 minutes between orders from same phone
const PHONE_COOLDOWN_MS = 2 * 60 * 1000

export function checkPhoneRateLimit(phone: string): { allowed: boolean; reason?: string; retryAfterMs?: number } {
  if (!phone) return { allowed: true } // DINE_IN may not have phone

  const now = Date.now()
  const entry = phoneStore.get(phone)

  if (!entry) {
    phoneStore.set(phone, { orderCount: 1, lastOrderTime: now })
    return { allowed: true }
  }

  // Check cooldown (2 min between orders)
  if (now - entry.lastOrderTime < PHONE_COOLDOWN_MS) {
    const retryAfterMs = PHONE_COOLDOWN_MS - (now - entry.lastOrderTime)
    return { allowed: false, reason: 'يرجى الانتظار قليلاً قبل تقديم طلب جديد', retryAfterMs }
  }

  // Check max active orders
  if (entry.orderCount >= PHONE_MAX_ACTIVE_ORDERS) {
    return { allowed: false, reason: `لديك ${PHONE_MAX_ACTIVE_ORDERS} طلبات نشطة بالفعل` }
  }

  entry.orderCount++
  entry.lastOrderTime = now
  return { allowed: true }
}

// Call this when an order is delivered/cancelled to free up the slot
export function releasePhoneOrder(phone: string) {
  if (!phone) return
  const entry = phoneStore.get(phone)
  if (entry && entry.orderCount > 0) {
    entry.orderCount--
  }
}

// ─── Minimum Order Value ───────────────────────────────────────
const MIN_ORDER_VALUE = 20 // 20 جنيه حد أدنى

export function checkMinOrderValue(total: number): { allowed: boolean } {
  return { allowed: total >= MIN_ORDER_VALUE }
}

export function getMinOrderValue(): number {
  return MIN_ORDER_VALUE
}

// ─── Cleanup old entries periodically ──────────────────────────
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    // Clean IP store
    for (const [ip, entry] of ipStore.entries()) {
      if (now - entry.firstAttempt > IP_WINDOW_MS) {
        ipStore.delete(ip)
      }
    }
    // Clean phone store (reset after 2 hours of inactivity)
    for (const [phone, entry] of phoneStore.entries()) {
      if (now - entry.lastOrderTime > 2 * 60 * 60 * 1000) {
        phoneStore.delete(phone)
      }
    }
  }, 10 * 60 * 1000) // Every 10 minutes
}
