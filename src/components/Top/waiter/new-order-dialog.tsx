'use client'

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { ShoppingCart } from 'lucide-react'
import { MealSelector } from './meal-selector'
import { CartSection } from './cart-section'
import type { Meal, Order, OrderType, CartItemType } from '@/lib/saraya/types'

interface NewOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  // Order type controls
  orderType: OrderType
  setOrderType: (type: OrderType) => void
  tableNumber: string
  setTableNumber: (v: string) => void
  customerName: string
  setCustomerName: (v: string) => void
  customerPhone: string
  setCustomerPhone: (v: string) => void
  deliveryAddress: string
  setDeliveryAddress: (v: string) => void
  existingTableOrder: Order | null

  // Meal list
  meals: Meal[]
  loadingMeals: boolean

  // Search / filter
  searchQuery: string
  setSearchQuery: (v: string) => void
  filterCategory: string
  setFilterCategory: (v: string) => void

  // Cart
  cart: CartItemType[]
  addToCart: (meal: Meal) => void
  removeFromCart: (mealId: string) => void
  updateCartQuantity: (mealId: string, delta: number) => void
  getCartQuantity: (mealId: string) => number
  notes: string
  setNotes: (v: string) => void
  submitting: boolean
  onSubmit: () => void
}

export function NewOrderDialog({
  open,
  onOpenChange,
  orderType,
  setOrderType,
  tableNumber,
  setTableNumber,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  deliveryAddress,
  setDeliveryAddress,
  existingTableOrder,
  meals,
  loadingMeals,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  cart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  getCartQuantity,
  notes,
  setNotes,
  submitting,
  onSubmit,
}: NewOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[92vw] max-h-[90vh] overflow-y-auto p-0 gap-0" dir="rtl">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <DialogTitle className="text-[#D4AF37] flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            طلب جديد
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            إضافة طلب جديد للعميل
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full min-h-[360px] flex-col overflow-hidden md:flex-row-reverse">
          {/* Left: Meal selection */}
          <MealSelector
            orderType={orderType}
            setOrderType={setOrderType}
            tableNumber={tableNumber}
            setTableNumber={setTableNumber}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            deliveryAddress={deliveryAddress}
            setDeliveryAddress={setDeliveryAddress}
            existingTableOrder={existingTableOrder}
            meals={meals}
            loadingMeals={loadingMeals}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            cart={cart}
            addToCart={addToCart}
            updateCartQuantity={updateCartQuantity}
            getCartQuantity={getCartQuantity}
          />

          {/* Right: Cart summary */}
          <CartSection
            cart={cart}
            orderType={orderType}
            notes={notes}
            setNotes={setNotes}
            removeFromCart={removeFromCart}
            submitting={submitting}
            onSubmit={onSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

