// Meal types
export interface Meal {
  id: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  price: number
  prepTime: string
  category: string
  categoryAr: string
  preparationArea: 'KITCHEN' | 'BARISTA' | 'HALL'
  imageUrl: string
  isActive: boolean
}

// AddOn types
export interface AddOn {
  id: string
  mealId: string
  title: string
  titleAr: string
  price: number
  imageUrl: string
  isRecommended: boolean
  isActive: boolean
}

// Order types
export interface OrderItem {
  id: string
  mealId: string
  mealTitle: string
  mealTitleAr: string
  quantity: number
  price: number
  category?: string
  preparationArea: string
  imageUrl?: string
  addOns?: { title: string; titleAr: string; price: number }[]
  addedQuantity?: number
  createdAt?: string
  updatedAt?: string
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'READY_TO_PAY' | 'DELIVERED' | 'CANCELLED'
export type KitchenBaristaStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'CANCELLED'

export interface Order {
  id: string
  orderNumber: number
  type: OrderType
  status: OrderStatus
  customerName: string
  customerPhone: string
  deliveryAddress?: string
  tableNumber?: string
  items: OrderItem[]
  subtotal: number
  serviceCharge: number
  total: number
  kitchenAccess: boolean
  kitchenStatus: KitchenBaristaStatus
  baristaStatus: KitchenBaristaStatus
  notes?: string
  cancelledBy?: string
  shiftId?: string
  createdAt: string
  updatedAt: string
}

// Promotion types
export interface Promotion {
  id: string
  bannerImageUrl: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  price: number        // السعر بعد الخصم
  oldPrice: number      // السعر الأصلي قبل الخصم
  discount: number      // نسبة الخصم المئوية
  mealId: string | null
  buttonText: string
  buttonTextAr: string
  buttonLink: string
  isActive: boolean
  mealItems?: Array<{ id: string; mealId: string; meal: Meal }> // الوجبات المرتبطة بالعرض
}

// Shift types
export interface Shift {
  id: string
  startedBy: string
  endedBy?: string   // FIX: was closedBy (not in schema)
  status: 'OPEN' | 'CLOSED'
  endedAt?: string   // FIX: was closedAt (not in schema)
  notes?: string
  createdAt: string
  updatedAt: string
}

// Expense types
export interface Expense {
  id: string
  category: string
  description: string
  amount: number
  shiftId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Staff types
export interface StaffMember {
  id: string
  username: string
  password: string
  role: 'ADMIN' | 'WAITER' | 'CASHIER' | 'KITCHEN' | 'BARISTA'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Cart types (for client menu)
export interface SelectedAddOn {
  id: string
  title: string
  titleAr: string
  price: number
}

export interface CartItemType {
  mealId: string
  title: string
  titleAr: string
  price: number
  quantity: number
  imageUrl: string
  addOns: SelectedAddOn[]
  preparationArea?: string  // FIX: was missing — barista items were sent to KITCHEN
  category?: string
}

// Order Stats
export interface OrderStats {
  totalOrders: number
  pendingOrders: number
  preparingOrders: number
  readyOrders: number
  readyToPayOrders: number
  cancelledOrders: number
  todayRevenue: number
  todayOrders: number
}

// Admin-specific types
export interface ShiftWithDetails {
  id: string
  startedAt: string
  endedAt?: string
  startedBy: string
  endedBy: string
  totalRevenue: number
  totalExpenses: number
  netRevenue: number
  status: string
  notes: string
}

export interface ExpenseItem {
  id: string
  title: string
  amount: number
  category: string
  createdAt: string
  addedBy: string
}

export interface DeleteTarget {
  type: 'meal' | 'promotion' | 'addon'
  id: string
  name: string
}

export type PreparationArea = 'KITCHEN' | 'BARISTA' | 'HALL'
