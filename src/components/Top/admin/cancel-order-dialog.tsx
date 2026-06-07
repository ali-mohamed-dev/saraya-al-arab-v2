'use client'

import { AlertTriangle, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Order } from '@/lib/saraya/types'

interface CancelOrderDialogProps {
  order: Order | null
  onClose: () => void
  onConfirm: (orderId: string) => void
}

export function CancelOrderDialog({ order, onClose, onConfirm }: CancelOrderDialogProps) {
  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border/50" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            تأكيد إلغاء الطلب
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            هل أنت متأكد من إلغاء الطلب رقم #{order?.orderNumber}؟
            سيتم تحويله إلى ملغي وسيُحذف من الإيراد.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border/50">تراجع</Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (order) {
                onConfirm(order.id)
                onClose()
              }
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" /> إلغاء الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
