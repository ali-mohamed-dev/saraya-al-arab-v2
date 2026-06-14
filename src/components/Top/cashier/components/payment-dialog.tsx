'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { BadgeCheck, Plus, Trash2, Banknote, CreditCard, Smartphone } from 'lucide-react'
import type { Payment, PaymentMethod } from '@/lib/saraya/types'

interface PaymentDialogProps {
  open: boolean
  totalAmount: number
  orderLabel: string
  onConfirm: (payments: Payment[]) => void
  onCancel: () => void
}

const METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: typeof Banknote; color: string }> = {
  CASH: { label: 'كاش', icon: Banknote, color: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
  VISA: { label: 'فيزا', icon: CreditCard, color: 'bg-blue-600 hover:bg-blue-500 text-white' },
  VODAFONE_CASH: { label: 'فودافون كاش', icon: Smartphone, color: 'bg-purple-600 hover:bg-purple-500 text-white' },
}

export function PaymentDialog({ open, totalAmount, orderLabel, onConfirm, onCancel }: PaymentDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH')
  const [amountInput, setAmountInput] = useState('')

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, totalAmount - totalPaid)
  const isComplete = Math.abs(totalPaid - totalAmount) < 0.01

  const addPayment = () => {
    const amt = parseFloat(amountInput)
    if (isNaN(amt) || amt <= 0) return
    const clamped = Math.min(amt, remaining || totalAmount)
    if (clamped <= 0) return
    setPayments(prev => [...prev, { method: selectedMethod, amount: clamped }])
    setAmountInput('')
  }

  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index))
  }

  const quickAmount = (frac: number) => {
    const amt = totalAmount * frac
    setAmountInput(amt.toFixed(2))
  }

  const reset = () => {
    setPayments([])
    setSelectedMethod('CASH')
    setAmountInput('')
  }

  const handleConfirm = () => {
    if (!isComplete) return
    onConfirm(payments)
    reset()
  }

  const handleCancel = () => {
    reset()
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel() }}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>طريقة الدفع — {orderLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total info */}
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">إجمالي الفاتورة</span>
            <span className="text-xl font-bold">{totalAmount.toFixed(2)} ج.م</span>
          </div>

          {/* Remaining */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">المتبقي</span>
            <span className={`text-lg font-bold ${remaining > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {remaining.toFixed(2)} ج.م
            </span>
          </div>

          {/* Payment list */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <Label>طرق الدفع المضافة</Label>
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${METHOD_CONFIG[p.method].color.split(' ')[0]}`}>
                      {METHOD_CONFIG[p.method].label}
                    </span>
                    <span className="font-bold">{p.amount.toFixed(2)} ج.م</span>
                  </div>
                  <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Separator />
            </div>
          )}

          {/* Add payment form */}
          {remaining > 0 && (
            <div className="space-y-3 p-3 rounded-lg border border-border/50">
              <Label>إضافة طريقة دفع</Label>

              {/* Method selector */}
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(METHOD_CONFIG) as [PaymentMethod, typeof METHOD_CONFIG['CASH']][]).map(([method, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <button
                      key={method}
                      onClick={() => setSelectedMethod(method)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-bold transition-all
                        ${selectedMethod === method ? cfg.color : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                      <Icon className="h-5 w-5" />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>

              {/* Amount input */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining}
                  placeholder="المبلغ"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addPayment() }}
                  className="flex-1"
                />
                <Button onClick={addPayment} disabled={!amountInput || parseFloat(amountInput) <= 0} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> إضافة
                </Button>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                <button onClick={() => quickAmount(1)} className="flex-1 p-1.5 rounded text-xs bg-muted hover:bg-muted/80 text-muted-foreground">
                  الكل
                </button>
                <button onClick={() => quickAmount(0.5)} className="flex-1 p-1.5 rounded text-xs bg-muted hover:bg-muted/80 text-muted-foreground">
                  النصف
                </button>
                <button onClick={() => setAmountInput(remaining.toFixed(2))} className="flex-1 p-1.5 rounded text-xs bg-muted hover:bg-muted/80 text-muted-foreground">
                  الباقي ({remaining.toFixed(0)})
                </button>
              </div>
            </div>
          )}

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            disabled={!isComplete}
            className="w-full gap-2 bg-green-600 hover:bg-green-500 text-white font-bold h-11"
          >
            <BadgeCheck className="h-5 w-5" />
            تأكيد الدفع
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
