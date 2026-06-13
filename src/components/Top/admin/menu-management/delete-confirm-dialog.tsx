'use client'

import { Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { DeleteTarget } from '@/lib/saraya/types'

interface DeleteConfirmDialogProps {
  deleteTarget: DeleteTarget | null
  onClose: () => void
  onConfirm: (type: DeleteTarget['type'], id: string) => void
}

export function DeleteConfirmDialog({ deleteTarget, onClose, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={!!deleteTarget} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border/50" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> تأكيد الحذف
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            هل أنت متأكد من حذف &quot;{deleteTarget?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border/50">إلغاء</Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteTarget) onConfirm(deleteTarget.type, deleteTarget.id)
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" /> حذف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

