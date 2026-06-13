/**
 * Server-side order price calculation utilities.
 *
 * These functions ensure that ALL pricing is derived from the database,
 * preventing clients from manipulating subtotal / serviceCharge / deliveryFee / total.
 */

import { db } from '@/lib/db'
import { SERVICE_CHARGE_RATE, DELIVERY_FEE } from '@/lib/saraya/constants'

// ─── Types ────────────────────────────────────────────────────────────────

interface IncomingItem {
  mealId: string
  quantity: number
  addOns: unknown // JSON string or array
  notes?: string
}

interface ResolvedItem {
  mealId: string
  mealTitle: string
  mealTitleAr: string
  /** Base meal price (from DB) — does NOT include addOn prices */
  price: number
  quantity: number
  addOns: string // JSON string
  preparationArea: string
  imageUrl: string
  category: string
  notes: string
}

interface CalculatedTotals {
  subtotal: number
  serviceCharge: number
  deliveryFee: number
  discountAmount: number
  total: number
  resolvedItems: ResolvedItem[]
}

// ─── Validate quantity ────────────────────────────────────────────────────

export function validateQuantity(qty: unknown): number {
  const n = parseInt(String(qty), 10)
  if (isNaN(n) || n < 1) throw new Error(`Invalid quantity: ${qty}. Must be a positive integer.`)
  return n
}

// ─── Validate discount ────────────────────────────────────────────────────

export function validateDiscount(
  discountType: string,
  discountValue: number,
): { valid: boolean; error?: string } {
  if (!discountType || discountType === '') return { valid: true }
  if (discountValue < 0) {
    return { valid: false, error: 'قيمة الخصم لا يمكن أن تكون سالبة' }
  }
  if (discountType === 'PERCENTAGE' && discountValue > 100) {
    return { valid: false, error: 'نسبة الخصم لا يمكن أن تتجاوز 100%' }
  }
  return { valid: true }
}

// ─── Resolve items from DB & compute totals ───────────────────────────────

/**
 * Fetches actual meal/addOn prices from the database, validates quantities,
 * and computes the correct subtotal, serviceCharge, deliveryFee, and total.
 *
 * The returned `price` on each resolved item is the **base meal price** (no addOns).
 * AddOn prices are stored inside the `addOns` JSON string.
 *
 * Subtotal formula: Σ (mealBasePrice + Σ addOnPrices) × quantity
 */
export async function calculateOrderTotals(
  items: IncomingItem[],
  orderType: string,
  existingDiscountAmount: number = 0,
): Promise<CalculatedTotals> {
  // 1) Gather unique meal IDs
  const mealIds = Array.from(new Set(items.map(i => i.mealId).filter(Boolean)))

  // 2) Fetch meals with their active addOns from DB
  const meals = await db.meal.findMany({
    where: { id: { in: mealIds } },
    select: {
      id: true,
      title: true,
      titleAr: true,
      price: true,
      preparationArea: true,
      imageUrl: true,
      category: true,
      categoryAr: true,
      addons: {
        where: { isActive: true },
        select: { id: true, title: true, titleAr: true, price: true },
      },
    },
  })

  const mealMap = new Map(meals.map(m => [m.id, m]))

  // 3) Resolve each incoming item against DB data
  const resolvedItems: ResolvedItem[] = []
  let subtotal = 0

  for (const item of items) {
    const meal = mealMap.get(item.mealId)
    if (!meal) {
      throw new Error(`Meal not found: ${item.mealId}`)
    }

    const quantity = validateQuantity(item.quantity)

    // Parse addOns — the client may send a JSON string or an array of objects
    let addOnArray: { id?: string; title?: string; titleAr?: string; price?: number }[] = []
    try {
      const raw = typeof item.addOns === 'string' ? JSON.parse(item.addOns) : item.addOns
      if (Array.isArray(raw)) addOnArray = raw
    } catch (e) { console.warn('calculate-order: failed to parse addOns', e); }

    // Validate each addOn against the meal's addOns from DB
    const dbAddOnMap = new Map(meal.addons.map(a => [a.id, a]))
    const validatedAddOns: { id: string; title: string; titleAr: string; price: number }[] = []
    let addOnPriceSum = 0

    for (const addOn of addOnArray) {
      if (!addOn.id) continue
      const dbAddOn = dbAddOnMap.get(addOn.id)
      if (dbAddOn) {
        // Use the DB price, ignore whatever the client sent
        validatedAddOns.push({
          id: dbAddOn.id,
          title: dbAddOn.title,
          titleAr: dbAddOn.titleAr,
          price: dbAddOn.price,
        })
        addOnPriceSum += dbAddOn.price
      }
      // If addOn ID doesn't exist in DB for this meal, skip it silently
    }

    // Unit price = base meal price (no addOns)
    // Subtotal contribution = (basePrice + addOns) * quantity
    const lineTotal = (meal.price + addOnPriceSum) * quantity
    subtotal += lineTotal

    resolvedItems.push({
      mealId: meal.id,
      mealTitle: meal.title,
      mealTitleAr: meal.titleAr,
      price: meal.price, // base price only
      quantity,
      addOns: JSON.stringify(validatedAddOns),
      preparationArea: meal.preparationArea || 'KITCHEN',
      imageUrl: meal.imageUrl || '',
      category: meal.categoryAr || meal.category || '',
      notes: item.notes || '',
    })
  }

  // 4) Calculate serviceCharge: only for DINE_IN
  const serviceCharge =
    orderType === 'DINE_IN'
      ? Math.round(subtotal * SERVICE_CHARGE_RATE * 100) / 100
      : 0

  // 5) Calculate deliveryFee: only for DELIVERY
  const deliveryFee = orderType === 'DELIVERY' ? DELIVERY_FEE : 0

  // 6) Total = subtotal + serviceCharge + deliveryFee - discount
  const total = Math.max(0, subtotal + serviceCharge + deliveryFee - existingDiscountAmount)

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    serviceCharge,
    deliveryFee,
    discountAmount: existingDiscountAmount,
    total: Math.round(total * 100) / 100,
    resolvedItems,
  }
}

// ─── Recalculate totals from existing order items (after add/remove/update) ─

/**
 * Re-reads all items of an order from the DB and recalculates totals.
 * The `price` field on each OrderItem stores the BASE meal price.
 * AddOn prices are inside the `addOns` JSON field.
 *
 * Subtotal formula: Σ (item.price + Σ addOnPrices) × item.quantity
 */
export function recalculateFromItems(
  items: { price: number; quantity: number; addOns: string }[],
  orderType: string,
  existingDiscountAmount: number = 0,
  existingDeliveryFee: number = 0,
): { subtotal: number; serviceCharge: number; deliveryFee: number; total: number } {
  let subtotal = 0

  for (const item of items) {
    let addOnTotal = 0
    try {
      const parsed = typeof item.addOns === 'string' ? JSON.parse(item.addOns) : []
      if (Array.isArray(parsed)) {
        addOnTotal = parsed.reduce(
          (s: number, a: { price?: number }) => s + (a.price || 0),
          0,
        )
      }
    } catch (e) { console.warn('calculate-order: failed to parse addOns in recalculateFromItems', e); }

    // item.price is the BASE meal price — addOns are separate
    subtotal += (item.price + addOnTotal) * item.quantity
  }

  const serviceCharge =
    orderType === 'DINE_IN'
      ? Math.round(subtotal * SERVICE_CHARGE_RATE * 100) / 100
      : 0

  const deliveryFee = orderType === 'DELIVERY' ? (existingDeliveryFee || DELIVERY_FEE) : 0

  const total = Math.max(0, subtotal + serviceCharge + deliveryFee - existingDiscountAmount)

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    serviceCharge,
    deliveryFee,
    total: Math.round(total * 100) / 100,
  }
}

// ─── Status transition validation ─────────────────────────────────────────

const VALID_ORDER_STATUSES = new Set([
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY', 'DELIVERED', 'CANCELLED',
])

const VALID_KITCHEN_STATUSES = new Set(['PENDING', 'CONFIRMED', 'RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'])

/**
 * Valid forward transitions for the order lifecycle.
 * Key = current status, Value = set of allowed next statuses.
 */
const VALID_TRANSITIONS: Record<string, Set<string>> = {
  PENDING: new Set(['CONFIRMED', 'CANCELLED']),
  CONFIRMED: new Set(['PREPARING', 'CANCELLED']),
  PREPARING: new Set(['READY', 'CANCELLED']),
  READY: new Set(['READY_TO_PAY', 'PREPARING', 'CANCELLED', 'DELIVERED']),
  READY_TO_PAY: new Set(['DELIVERED', 'CANCELLED']),
  // DELIVERED and CANCELLED are terminal states
  DELIVERED: new Set(),
  CANCELLED: new Set(),
}

/**
 * Validates whether a status transition is allowed.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
): { valid: boolean; error?: string } {
  if (!VALID_ORDER_STATUSES.has(newStatus)) {
    return { valid: false, error: `حالة غير صالحة: ${newStatus}` }
  }

  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.has(newStatus)) {
    return {
      valid: false,
      error: `لا يمكن تحويل الطلب من "${currentStatus}" إلى "${newStatus}"`,
    }
  }

  return { valid: true }
}

/**
 * Validates kitchen/barista status values.
 * Only allows recognized values and forward transitions.
 */
export function validatePreparationStatus(
  currentStatus: string,
  newStatus: string,
  label: string, // "المطبخ" or "الباريستا"
): { valid: boolean; error?: string } {
  if (!VALID_KITCHEN_STATUSES.has(newStatus)) {
    return { valid: false, error: `حالة ${label} غير صالحة: ${newStatus}` }
  }

  // Define forward transitions for preparation statuses
  const prepTransitions: Record<string, Set<string>> = {
    PENDING: new Set(['CONFIRMED', 'RECEIVED', 'PREPARING', 'READY', 'CANCELLED']),
    CONFIRMED: new Set(['RECEIVED', 'PREPARING', 'READY', 'CANCELLED']),
    RECEIVED: new Set(['PREPARING', 'READY', 'CANCELLED']),
    PREPARING: new Set(['READY', 'CANCELLED']),
    READY: new Set(['DELIVERED', 'CANCELLED']),
    DELIVERED: new Set(),
    CANCELLED: new Set(),
  }

  const allowed = prepTransitions[currentStatus]
  if (!allowed || !allowed.has(newStatus)) {
    return {
      valid: false,
      error: `لا يمكن تحويل ${label} من "${currentStatus}" إلى "${newStatus}"`,
    }
  }

  return { valid: true }
}
