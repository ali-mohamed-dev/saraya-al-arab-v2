export type OrderType = 'dine-in' | 'takeaway' | 'delivery' | null

export type CartStep = 'cart' | 'order-type' | 'confirm' | 'success'

export interface TableInfoType {
  tableNumber: string
  tableCode: string
  isValid: boolean
}

export interface OrderSummaryType {
  subtotal: number
  serviceCharge: number
  deliveryFee: number
  discount: number
  total: number
}