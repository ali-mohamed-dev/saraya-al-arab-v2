'use client'

import { UtensilsCrossed, Receipt, BadgeCheck, Loader2, X, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import type { Order } from '@/lib/saraya/types'
import { ORDER_STATUS_MAP, ORDER_TYPE_MAP } from '@/lib/saraya/constants'
import { formatDate, formatTime, escapeHtml } from '@/lib/saraya/helpers'

interface ReceiptDialogProps {
  receiptOrder: Order | null
  receiptTableOrders: Order[] | null
  updatingOrderId: string | null
  payingTable: string | null
  onMarkAsPaid: (orderId: string) => void
  onMarkTableAsPaid: (orders: Order[]) => void
  onCloseOrder: () => void
  onCloseTable: () => void
}

function addOnsTotal(addOns: { price: number }[] | undefined): number {
  if (!addOns) return 0
  return addOns.reduce((sum, a) => sum + a.price, 0)
}

// ═══════════════════════════════════════════════════════
// طباعة طلب واحد في نافذة جديدة
// ═══════════════════════════════════════════════════════
function printSingleOrder(order: Order) {
  const itemsHtml = order.items.map(item => {
    const lineTotal = (item.price + (item.addOns?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity
    const addOnsHtml = item.addOns?.map(a =>
      `<div style="font-size:11px;color:#666;padding-right:10px;">+ ${escapeHtml(a.titleAr || a.title)} (${a.price.toFixed(2)} ج.م)</div>`
    ).join('') || ''
    return `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;">
          <div style="font-weight:500;">${escapeHtml(item.mealTitleAr || item.mealTitle)}</div>
          ${addOnsHtml}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:left;">${lineTotal.toFixed(2)} ج.م</td>
      </tr>
    `
  }).join('')

  const content = `
    <html>
      <head>
        <title>فاتورة #${order.orderNumber}</title>
        <style>
          body{font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:350px;margin:0 auto;padding:10px;}
          table{width:100%;border-collapse:collapse;}
          th{border-bottom:2px solid #D4AF37;padding:4px 0;color:#666;font-size:12px;}
          .header{text-align:center;border-bottom:2px solid #D4AF37;padding-bottom:10px;margin-bottom:10px;}
          .header h1{color:#D4AF37;margin:0;font-size:22px;}
          .header p{color:#888;margin:4px 0 0;font-size:11px;}
          .info{font-size:12px;margin-bottom:10px;}
          .info div{display:flex;justify-content:space-between;padding:2px 0;}
          .info .label{color:#666;}
          .total-section{border-top:2px solid #D4AF37;margin-top:10px;padding-top:8px;}
          .total-section div{display:flex;justify-content:space-between;padding:2px 0;font-size:12px;}
          .total-row{font-size:16px;font-weight:bold;color:#D4AF37;}
          .notes{margin-top:10px;font-size:11px;color:#666;border-top:1px dashed #ddd;padding-top:6px;}
        </style>
      </head>
      <body>
        <div class="header">
          <h1>توب</h1>
          <p>Top Restaurant</p>
        </div>
        <div class="info">
          <div><span class="label">رقم الطلب</span><span style="font-weight:bold;color:#D4AF37;">#${order.orderNumber}</span></div>
          <div><span class="label">التاريخ</span><span>${formatDate(order.createdAt)}</span></div>
          <div><span class="label">الوقت</span><span>${formatTime(order.createdAt)}</span></div>
          <div><span class="label">النوع</span><span>${ORDER_TYPE_MAP[order.type]?.label || order.type}</span></div>
          ${order.type === 'DINE_IN' && order.tableNumber ? `<div><span class="label">طاولة</span><span>${order.tableNumber}</span></div>` : ''}
          <div><span class="label">العميل</span><span>${escapeHtml(order.customerName)}</span></div>
          ${order.customerPhone ? `<div><span class="label">الهاتف</span><span dir="ltr">${order.customerPhone}</span></div>` : ''}
          ${order.deliveryAddress ? `<div><span class="label">العنوان</span><span>${escapeHtml(order.deliveryAddress)}</span></div>` : ''}
        </div>
        <table>
          <thead><tr><th>الصنف</th><th style="text-align:center;">الكمية</th><th style="text-align:left;">السعر</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="total-section">
          <div><span class="label">المجموع الفرعي</span><span>${order.subtotal.toFixed(2)} ج.م</span></div>
          ${order.serviceCharge > 0 ? `<div><span class="label">رسوم الخدمة</span><span>${order.serviceCharge.toFixed(2)} ج.م</span></div>` : ''}
          <div class="total-row"><span>الإجمالي</span><span>${order.total.toFixed(2)} ج.م</span></div>
        </div>
        ${order.notes ? `<div class="notes">ملاحظات: ${escapeHtml(order.notes)}</div>` : ''}
        <script>window.print();</script>
      </body>
    </html>
  `
  const printWindow = window.open('', '_blank', 'width=400,height=700')
  if (printWindow) { printWindow.document.write(content); printWindow.document.close() }
}

// ═══════════════════════════════════════════════════════
// طباعة فاتورة طاولة في نافذة جديدة
// ═══════════════════════════════════════════════════════
function printTableOrders(tableOrders: Order[]) {
  const tableNumber = tableOrders[0].tableNumber || ''
  const orderNumbers = tableOrders.map(o => `#${o.orderNumber}`).join(' + ')
  const subtotal = tableOrders.reduce((s, o) => s + o.subtotal, 0)
  const serviceCharge = tableOrders.reduce((s, o) => s + o.serviceCharge, 0)
  const total = tableOrders.reduce((s, o) => s + o.total, 0)

  const itemsHtml = tableOrders.flatMap(o =>
    o.items.map(item => {
      const lineTotal = (item.price + (item.addOns?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity
      const addOnsHtml = item.addOns?.map(a =>
        `<div style="font-size:11px;color:#666;padding-right:10px;">+ ${escapeHtml(a.titleAr || a.title)} (${a.price.toFixed(2)} ج.م)</div>`
      ).join('') || ''
      return `
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #eee;">
            <div style="font-weight:500;">${escapeHtml(item.mealTitleAr || item.mealTitle)}</div>
            ${addOnsHtml}
            <div style="font-size:10px;color:#888;">طلب #${o.orderNumber}</div>
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:left;">${lineTotal.toFixed(2)} ج.م</td>
        </tr>
      `
    })
  ).join('')

  const content = `
    <html>
      <head>
        <title>فاتورة طاولة ${tableNumber}</title>
        <style>
          body{font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:350px;margin:0 auto;padding:10px;}
          table{width:100%;border-collapse:collapse;}
          th{border-bottom:2px solid #D4AF37;padding:4px 0;color:#666;font-size:12px;}
          .header{text-align:center;border-bottom:2px solid #D4AF37;padding-bottom:10px;margin-bottom:10px;}
          .header h1{color:#D4AF37;margin:0;font-size:22px;}
          .header p{color:#888;margin:4px 0 0;font-size:11px;}
          .total-section{border-top:2px solid #D4AF37;margin-top:10px;padding-top:8px;}
          .total-section div{display:flex;justify-content:space-between;padding:2px 0;font-size:12px;}
          .total-row{font-size:16px;font-weight:bold;color:#D4AF37;}
        </style>
      </head>
      <body>
        <div class="header">
          <h1>فاتورة طاولة ${tableNumber}</h1>
          <p>طلبات ${orderNumbers}</p>
        </div>
        <table>
          <thead><tr><th>الصنف</th><th style="text-align:center;">الكمية</th><th style="text-align:left;">السعر</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="total-section">
          <div><span>المجموع الفرعي</span><span>${subtotal.toFixed(2)} ج.م</span></div>
          ${serviceCharge > 0 ? `<div><span>رسوم الخدمة</span><span>${serviceCharge.toFixed(2)} ج.م</span></div>` : ''}
          <div class="total-row"><span>الإجمالي</span><span>${total.toFixed(2)} ج.م</span></div>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `
  const printWindow = window.open('', '_blank', 'width=400,height=700')
  if (printWindow) { printWindow.document.write(content); printWindow.document.close() }
}

function printReceipt(order: Order | null, tableOrders: Order[] | null) {
  if (order) {
    printSingleOrder(order)
  } else if (tableOrders && tableOrders.length > 0) {
    printTableOrders(tableOrders)
  }
}

// ═══════════════════════════════════════════════════════
// عرض الفاتورة - طلب واحد
// ═══════════════════════════════════════════════════════
function renderSingleReceipt(order: Order) {
  return (
    <div className="bg-background text-foreground" dir="rtl">
      <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/30 px-6 py-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <UtensilsCrossed className="h-6 w-6 text-[#D4AF37]" />
          <h2 className="text-2xl font-bold text-[#D4AF37]">توب</h2>
        </div>
        <p className="text-xs text-muted-foreground">top Restaurant</p>
      </div>
      <div className="px-6 py-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">رقم الطلب</span><span className="font-bold text-[#D4AF37]">#{order.orderNumber}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">التاريخ</span><span>{formatDate(order.createdAt)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">الوقت</span><span>{formatTime(order.createdAt)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">النوع</span><span className={ORDER_TYPE_MAP[order.type]?.color || ''}>{ORDER_TYPE_MAP[order.type]?.label || order.type}</span></div>
        {order.type === 'DINE_IN' && order.tableNumber && <div className="flex justify-between"><span className="text-muted-foreground">رقم الطاولة</span><span>{order.tableNumber}</span></div>}
        <div className="flex justify-between"><span className="text-muted-foreground">العميل</span><span>{order.customerName}</span></div>
        {order.customerPhone && <div className="flex justify-between"><span className="text-muted-foreground">الهاتف</span><span dir="ltr">{order.customerPhone}</span></div>}
        {order.deliveryAddress && <div className="flex justify-between"><span className="text-muted-foreground">العنوان</span><span className="text-left max-w-[60%]">{order.deliveryAddress}</span></div>}
      </div>
      <Separator className="bg-border/30" />
      <div className="px-6 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground">
              <th className="pb-2 text-right font-medium">الصنف</th>
              <th className="pb-2 text-center font-medium w-16">الكمية</th>
              <th className="pb-2 text-left font-medium w-24">السعر</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => {
              const lineTotal = (item.price + addOnsTotal(item.addOns)) * item.quantity
              return (
                <tr key={item.id} className="border-b border-border/10">
                  <td className="py-2.5">
                    <p className="font-medium">{item.mealTitleAr || item.mealTitle}</p>
                    {item.addOns?.map((a, i) => (
                      <p key={i} className="text-xs text-muted-foreground">+ {a.titleAr || a.title} ({a.price.toFixed(2)} ج.م)</p>
                    ))}
                  </td>
                  <td className="py-2.5 text-center">{item.quantity}</td>
                  <td className="py-2.5 text-left">{lineTotal.toFixed(2)} ج.م</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Separator className="bg-border/30" />
      <div className="px-6 py-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{order.subtotal.toFixed(2)} ج.م</span></div>
        {order.serviceCharge > 0 && <div className="flex justify-between"><span className="text-muted-foreground">رسوم الخدمة</span><span>{order.serviceCharge.toFixed(2)} ج.م</span></div>}
        <Separator className="bg-border/30 my-1" />
        <div className="flex justify-between text-lg font-bold">
          <span className="text-[#D4AF37]">الإجمالي</span>
          <span className="text-[#D4AF37]">{order.total.toFixed(2)} ج.م</span>
        </div>
      </div>
      {order.notes && (
        <div className="px-6 py-3">
          <p className="text-xs text-muted-foreground">ملاحظات: {order.notes}</p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// عرض الفاتورة - طاولة كاملة
// ═══════════════════════════════════════════════════════
function renderTableReceipt(tableOrders: Order[]) {
  const tableNumber = tableOrders[0].tableNumber || ''
  const orderNumbers = tableOrders.map((o) => `#${o.orderNumber}`).join(' + ')
  const subtotal = tableOrders.reduce((sum, order) => sum + order.subtotal, 0)
  const serviceCharge = tableOrders.reduce((sum, order) => sum + order.serviceCharge, 0)
  const total = tableOrders.reduce((sum, order) => sum + order.total, 0)

  const aggregatedItems = tableOrders.flatMap((order) =>
    order.items.map((item) => ({
      ...item,
      key: `${item.mealId}-${item.price}-${JSON.stringify(item.addOns ?? [])}`,
      orderNumber: order.orderNumber,
    }))
  ).reduce<Record<string, { mealTitle: string; mealTitleAr: string; quantity: number; price: number; addOnsTotal: number; orderNumbers: Set<number> }>>((acc, item) => {
    const key = item.key
    if (!acc[key]) {
      acc[key] = {
        mealTitle: item.mealTitle,
        mealTitleAr: item.mealTitleAr,
        quantity: item.quantity,
        price: item.price,
        addOnsTotal: addOnsTotal(item.addOns),
        orderNumbers: new Set([item.orderNumber]),
      }
    } else {
      acc[key].quantity += item.quantity
      acc[key].orderNumbers.add(item.orderNumber)
    }
    return acc
  }, {})

  return (
    <div className="bg-background text-foreground" dir="rtl">
      <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/30 px-6 py-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <UtensilsCrossed className="h-6 w-6 text-[#D4AF37]" />
          <h2 className="text-2xl font-bold text-[#D4AF37]">فاتورة طاولة {tableNumber}</h2>
        </div>
        <p className="text-xs text-muted-foreground">طلبات {orderNumbers}</p>
      </div>
      <div className="px-6 py-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">رقم الطاولة</span><span>{tableNumber}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">عدد الطلبات</span><span>{tableOrders.length}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">النوع</span><span className={ORDER_TYPE_MAP['DINE_IN']?.color || ''}>{ORDER_TYPE_MAP['DINE_IN']?.label}</span></div>
      </div>
      <Separator className="bg-border/30" />
      <div className="px-6 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground">
              <th className="pb-2 text-right font-medium">الصنف</th>
              <th className="pb-2 text-center font-medium w-16">الكمية</th>
              <th className="pb-2 text-left font-medium w-24">السعر</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(aggregatedItems).map((item, index) => {
              const lineTotal = (item.price + item.addOnsTotal) * item.quantity
              return (
                <tr key={`${item.mealTitle}-${index}`} className="border-b border-border/10">
                  <td className="py-2.5">
                    <p className="font-medium">{item.mealTitleAr || item.mealTitle}</p>
                    {item.addOnsTotal > 0 && <p className="text-xs text-muted-foreground">+ إضافات</p>}
                    <p className="text-[10px] text-muted-foreground">
                      طلبات {Array.from(item.orderNumbers).map((num) => `#${num}`).join(' + ')}
                    </p>
                  </td>
                  <td className="py-2.5 text-center">{item.quantity}</td>
                  <td className="py-2.5 text-left">{lineTotal.toFixed(2)} ج.م</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Separator className="bg-border/30" />
      <div className="px-6 py-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{subtotal.toFixed(2)} ج.م</span></div>
        {serviceCharge > 0 && <div className="flex justify-between"><span className="text-muted-foreground">رسوم الخدمة</span><span>{serviceCharge.toFixed(2)} ج.م</span></div>}
        <Separator className="bg-border/30 my-1" />
        <div className="flex justify-between text-lg font-bold">
          <span className="text-[#D4AF37]">الإجمالي</span>
          <span className="text-[#D4AF37]">{total.toFixed(2)} ج.م</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// المكون الرئيسي
// ═══════════════════════════════════════════════════════
export function ReceiptDialog({
  receiptOrder,
  receiptTableOrders,
  updatingOrderId,
  payingTable,
  onMarkAsPaid,
  onMarkTableAsPaid,
  onCloseOrder,
  onCloseTable,
}: ReceiptDialogProps) {
  const isOpen = !!receiptOrder || !!receiptTableOrders

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onCloseOrder()
        onCloseTable()
      }
    }}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-0 gap-0 bg-background border-[#D4AF37]/20 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>فاتورة الطلب</DialogTitle>
          <DialogDescription>تفاصيل فاتورة الطلب</DialogDescription>
        </DialogHeader>

        {/* منطقة المحتوى — تتـscroll لوحدها */}
        <div className="flex-1 overflow-y-auto">
          {receiptOrder && renderSingleReceipt(receiptOrder)}
          {receiptTableOrders && renderTableReceipt(receiptTableOrders)}
        </div>

        {/* الـ footer ثابت في الأسفل دايمًا */}
        <div className="border-t border-[#D4AF37]/20 bg-background p-4 flex gap-2" dir="rtl">
          {receiptOrder && (
            <>
              {(receiptOrder.status === 'READY_TO_PAY' || (receiptOrder.status === 'READY' && receiptOrder.type !== 'DINE_IN')) && (
                <Button
                  onClick={() => onMarkAsPaid(receiptOrder.id)}
                  disabled={updatingOrderId === receiptOrder.id}
                  className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-500 font-bold"
                >
                  {updatingOrderId === receiptOrder.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <BadgeCheck className="h-4 w-4" />}
                  تم الدفع
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => printReceipt(receiptOrder, null)}
                className="flex-1 gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Printer className="h-4 w-4" />طباعة
              </Button>
              <Button variant="ghost" onClick={onCloseOrder} className="gap-2 text-muted-foreground hover:text-red-400">
                <X className="h-4 w-4" />إغلاق
              </Button>
            </>
          )}

          {receiptTableOrders && (
            <>
              {(receiptTableOrders.some(o => o.status === 'READY_TO_PAY') || receiptTableOrders.every(o => o.status === 'READY')) && (
                <Button
                  onClick={() => onMarkTableAsPaid(receiptTableOrders)}
                  disabled={payingTable === receiptTableOrders[0]?.tableNumber}
                  className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-500 font-bold"
                >
                  {payingTable === receiptTableOrders[0]?.tableNumber
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <BadgeCheck className="h-4 w-4" />}
                  تم الدفع
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => printReceipt(null, receiptTableOrders)}
                className="flex-1 gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Printer className="h-4 w-4" />طباعة
              </Button>
              <Button variant="ghost" onClick={onCloseTable} className="gap-2 text-muted-foreground hover:text-red-400">
                <X className="h-4 w-4" />إغلاق
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

