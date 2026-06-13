'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { ShoppingCart, UtensilsCrossed } from 'lucide-react'
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
  customerEmail: string
  setCustomerEmail: (v: string) => void
  deliveryAddress: string
  setDeliveryAddress: (v: string) => void
  existingTableOrder: Order | null
  allowedTypes?: OrderType[]
  categories?: { value: string; label: string }[]
  customerResults?: { customerPhone: string; customerName: string; deliveryAddress: string | null; customerEmail?: string }[]
  onSearchCustomer?: (phone: string) => void
  onSelectCustomer?: (result: { customerPhone: string; customerName: string; deliveryAddress: string | null; customerEmail?: string }) => void
  searchingCustomer?: boolean
  onEmailLookup?: (email: string) => void

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
  updateItemNotes?: (mealId: string, notes: string) => void
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
  customerEmail,
  setCustomerEmail,
  deliveryAddress,
  setDeliveryAddress,
  existingTableOrder,
  allowedTypes,
  categories,
  customerResults,
  onSearchCustomer,
  onSelectCustomer,
  searchingCustomer,
  onEmailLookup,
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
  updateItemNotes,
  notes,
  setNotes,
  submitting,
  onSubmit,
}: NewOrderDialogProps) {
  // Mobile tab: 'menu' or 'cart'
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu')
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[92vw] max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col" dir="rtl">
        <DialogHeader className="p-4 md:p-6 md:pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="text-[#D4AF37] flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            طلب جديد
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            إضافة طلب جديد للعميل
          </DialogDescription>

          {/* Mobile tabs - only visible on small screens */}
          <div className="flex md:hidden mt-3 rounded-lg border border-border/50 overflow-hidden">
            <button
              onClick={() => setMobileTab('menu')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                mobileTab === 'menu'
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-b-2 border-[#D4AF37]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UtensilsCrossed className="h-4 w-4" />
              القائمة
            </button>
            <button
              onClick={() => setMobileTab('cart')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all relative ${
                mobileTab === 'cart'
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-b-2 border-[#D4AF37]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              السلة
              {cartCount > 0 && (
                <span className="absolute top-1 bg-[#D4AF37] text-black text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center" style={{ insetInlineStart: '30%' }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden md:flex-row-reverse">
          {/* Left: Meal selection - hidden on mobile when cart tab is active */}
          <div className={`flex-1 min-h-0 flex flex-col md:border-r border-border/50 overflow-hidden ${mobileTab !== 'menu' ? 'hidden md:flex' : 'flex'}`}>
            <MealSelector
              orderType={orderType}
              setOrderType={setOrderType}
              tableNumber={tableNumber}
              setTableNumber={setTableNumber}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              customerEmail={customerEmail}
              setCustomerEmail={setCustomerEmail}
              deliveryAddress={deliveryAddress}
              setDeliveryAddress={setDeliveryAddress}
              existingTableOrder={existingTableOrder}
              allowedTypes={allowedTypes}
              categories={categories}
              customerResults={customerResults}
              onSearchCustomer={onSearchCustomer}
              onSelectCustomer={onSelectCustomer}
              searchingCustomer={searchingCustomer}
              onEmailLookup={onEmailLookup}
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
          </div>

          {/* Right: Cart summary - hidden on mobile when menu tab is active */}
          <div className={`w-full md:w-80 min-h-0 flex flex-col border-t md:border-t-0 md:border-r border-border/50 bg-muted/20 overflow-hidden ${mobileTab !== 'cart' ? 'hidden md:flex' : 'flex'}`}>
            <CartSection
              cart={cart}
              orderType={orderType}
              notes={notes}
              setNotes={setNotes}
              removeFromCart={removeFromCart}
              updateItemNotes={updateItemNotes}
              submitting={submitting}
              onSubmit={onSubmit}
            />
          </div>
        </div>

        {/* Mobile bottom bar - quick cart summary + switch to cart */}
        {mobileTab === 'menu' && cartCount > 0 && (
          <div className="md:hidden shrink-0 border-t border-border/50 bg-background p-3 flex items-center gap-3">
            <div className="flex-1 text-sm">
              <span className="text-muted-foreground">{cartCount} صنف — </span>
              <span className="font-bold text-[#D4AF37]">
                {cart.reduce((s, i) => s + i.price * i.quantity + i.addOns.reduce((a, a2) => a + a2.price * i.quantity, 0), 0).toFixed(2)} ج.م
              </span>
            </div>
            <button
              onClick={() => setMobileTab('cart')}
              className="rounded-lg bg-[#D4AF37] text-black px-4 py-2 text-sm font-bold flex items-center gap-1.5 hover:bg-[#D4AF37]/90"
            >
              <ShoppingCart className="h-4 w-4" />
              السلة
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
