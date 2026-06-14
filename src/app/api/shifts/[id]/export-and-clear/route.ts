import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateShiftExcel } from '@/lib/saraya/excel-export'

// POST /api/shifts/[id]/export-and-clear
// إنهاء الوردية وحساب الإيرادات النهائية وتصدير Excel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { endedBy, notes } = await request.json()

    // 1. جلب بيانات الوردية الحالية
    const shift = await db.shift.findUnique({
      where: { id },
      include: {
        orders: { include: { items: true } },
        expenses: true,
      },
    })

    if (!shift) {
      return NextResponse.json({ error: 'الوردية غير موجودة' }, { status: 404 })
    }

    // لا يمكن إغلاق وردية مغلقة بالفعل
    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'الوردية مغلقة بالفعل' }, { status: 400 })
    }

    // التحقق من عدم وجود طلبات غير مدفوعة
    const unpaidCount = await db.order.count({
      where: { shiftId: id, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
    })
    if (unpaidCount > 0) {
      return NextResponse.json({
        error: `لا يمكن إغلاق الوردية. يوجد ${unpaidCount} طلب لم يتم دفعها بعد.`,
        unpaidOrders: unpaidCount,
      }, { status: 400 })
    }

    const deliveredOrders = shift.orders.filter(o => o.status === 'DELIVERED')
    const cancelledOrders = shift.orders.filter(o => o.status === 'CANCELLED')
    const discountedOrders = shift.orders.filter(o => o.discountAmount && o.discountAmount > 0 && o.discountType !== 'POINTS')

    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0)
    const totalExpenses = shift.expenses.reduce((sum, e) => sum + e.amount, 0)
    const netRevenue = totalRevenue - totalExpenses
    const totalDiscounts = deliveredOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0)

    // حساب طرق الدفع
    let cashRevenue = 0
    let visaRevenue = 0
    let vodafoneCashRevenue = 0
    deliveredOrders.forEach((o) => {
      const payments = (o.payments as Array<{ method: string; amount: number }> | undefined) ?? []
      if (payments.length > 0) {
        payments.forEach((p) => {
          if (p.method === 'CASH') cashRevenue += p.amount
          else if (p.method === 'VISA') visaRevenue += p.amount
          else if (p.method === 'VODAFONE_CASH') vodafoneCashRevenue += p.amount
        })
      } else {
        // Legacy: no payments array → treat as cash
        cashRevenue += o.total
      }
    })

    // 2. تحديث الوردية إلى حالة CLOSED
    const updatedShift = await db.shift.update({
      where: { id },
      data: {
        status: 'CLOSED',
        endedAt: new Date(),
        endedBy: endedBy || null,
        notes: notes || null,
        totalRevenue,
        totalExpenses,
        netRevenue,
        totalDiscounts,
        totalLoyaltyDiscounts: 0,
        cashRevenue,
        visaRevenue,
        vodafoneCashRevenue,
      },
    })

    // 3. توليد ملف الـ Excel مع بيانات كاملة
    const xlsxBuffer = await generateShiftExcel({
      shift: {
        startedAt: updatedShift.startedAt,
        endedAt: updatedShift.endedAt ?? undefined,
        startedBy: updatedShift.startedBy ?? '',
        endedBy: updatedShift.endedBy ?? undefined,
        notes: updatedShift.notes ?? undefined,
      },
      orders: deliveredOrders.map(o => ({
        orderNumber: o.orderNumber ?? 0,
        type: o.type,
        status: o.status,
        tableNumber: o.tableNumber,
        total: o.total || 0,
        customerName: o.customerName,
        createdAt: o.createdAt,
        items: o.items?.map((it) => ({
          name: it.mealTitleAr || it.mealTitle,
          qty: it.quantity,
          price: it.price,
        })),
        payments: (o.payments as Array<{ method: string; amount: number }> | undefined) ?? [],
      })),
      cancelledOrders: cancelledOrders.map(o => ({
        orderNumber: o.orderNumber ?? 0,
        type: o.type,
        status: o.status,
        total: o.total || 0,
        customerName: o.customerName,
        createdAt: o.createdAt,
        cancelledBy: o.cancelledBy,
        cancelReason: o.cancelReason,
      })),
      discountedOrders: discountedOrders.map(o => ({
        orderNumber: o.orderNumber ?? 0,
        type: o.type,
        status: o.status,
        total: o.total || 0,
        customerName: o.customerName,
        createdAt: o.createdAt,
        discountType: o.discountType || undefined,
        discountValue: o.discountValue || undefined,
        discountAmount: o.discountAmount || 0,
        discountReason: o.discountReason || undefined,
        cancelledBy: o.discountAppliedBy || undefined,
      })),
      expenses: shift.expenses.map(e => ({
        title: e.description || '',
        amount: e.amount || 0,
        category: e.category || 'عام',
        addedBy: e.createdBy || '',
        createdAt: e.createdAt,
      })),
      totalRevenue,
      totalExpenses,
      netRevenue,
      totalDiscounts,
      cashRevenue,
      visaRevenue,
      vodafoneCashRevenue,
    })

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="shift-${id.slice(0, 8)}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Shift closing error:', error)
    return NextResponse.json({ error: 'فشل في إغلاق الوردية' }, { status: 500 })
  }
}
