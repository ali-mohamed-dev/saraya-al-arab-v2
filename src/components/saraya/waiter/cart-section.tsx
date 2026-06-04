'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, X, Loader2, Send, StickyNote
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SERVICE_CHARGE_RATE } from '@/lib/saraya/constants'
import type { CartItemType } from '@/lib/saraya/types'

interface CartSectionProps {
  cart: CartItemType[]
  notes: string
  setNotes: (v: string) => void
  removeFromCart: (mealId: string) => void
  submitting: boolean
  onSubmit: () => void
}

export function CartSection({
  cart,
  notes,
  setNotes,
  removeFromCart,
  submitting,
  onSubmit,
}: CartSectionProps) {
  // Bug fix #6: include add-ons price in subtotal
  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      item.price * item.quantity +
      item.addOns.reduce((aSum, a) => aSum + a.price * item.quantity, 0),
    0
  )
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE * 100) / 100
  const total = subtotal + serviceCharge

  return (
    <div className="w-full md:w-80 min-h-0 flex flex-col border-t md:border-t-0 border-border/50 bg-muted/20 overflow-hidden">
      <div className="p-4 border-b border-border/30">
        <h3 className="font-bold text-[#D4AF37] flex items-center gap-2 text-sm">
          <ShoppingCart className="h-4 w-4" />
          السلة
          {cart.length > 0 && (
            <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 text-[10px]">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} صنف
            </Badge>
          )}
        </h3>
      </div>

      <ScrollArea className="max-h-[24rem] min-h-0 overflow-hidden">
        <div className="p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-20" />
              <p>السلة فارغة</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map((item) => {
                // Bug fix #6: include add-ons in line total
                const addOnsTotal = item.addOns.reduce((s, a) => s + a.price, 0)
                const lineTotal = (item.price + addOnsTotal) * item.quantity
                return (
                  <motion.div
                    key={item.mealId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 rounded-lg border border-border/30 bg-background p-2"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-8 w-10 rounded object-cover border border-[#D4AF37]/20 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.titleAr || item.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.quantity} × {item.price.toFixed(2)} ج.م
                        {addOnsTotal > 0 && (
                          <span className="text-orange-400"> +إضافات {addOnsTotal.toFixed(2)}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#D4AF37] flex-shrink-0">
                      {lineTotal.toFixed(2)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFromCart(item.mealId)}
                      className="h-6 w-6 text-muted-foreground hover:text-red-400 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Totals & submit */}
      <div className="p-4 border-t border-border/30 space-y-3">
        {/* Notes */}
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <StickyNote className="h-3 w-3" />
            ملاحظات
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات على الطلب..."
            className="bg-muted border-border/50 mt-1 min-h-[60px] text-xs"
            dir="rtl"
          />
        </div>

        <Separator className="bg-border/30" />

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>المجموع الفرعي</span>
            <span>{subtotal.toFixed(2)} ج.م</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>خدمة ({Math.round(SERVICE_CHARGE_RATE * 100)}%)</span>
            <span>{serviceCharge.toFixed(2)} ج.م</span>
          </div>
          <Separator className="bg-border/30" />
          <div className="flex justify-between font-bold text-[#D4AF37]">
            <span>الإجمالي</span>
            <span>{total.toFixed(2)} ج.م</span>
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={submitting || cart.length === 0}
          className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 gap-2 font-bold"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              إرسال الطلب
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
