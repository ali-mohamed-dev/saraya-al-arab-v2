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
        orders: { where: { status: 'DELIVERED' }, include: { items: true } },
        expenses: true,
      },
    })

    if (!shift) {
      return NextResponse.json({ error: 'الوردية غير موجودة' }, { status: 404 })
    }

    // لا يمكن إغلاق وردية مغلقة بالفعل
    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'الوردية مغفلة بالفعل' }, { status: 400 })
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

    const totalRevenue = shift.orders.reduce((sum, o) => sum + o.total, 0)
    const totalExpenses = shift.expenses.reduce((sum, e) => sum + e.amount, 0)
    const netRevenue = totalRevenue - totalExpenses

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
      orders: shift.orders.map(o => ({
        orderNumber: o.orderNumber ?? 0,
        type: o.type,
        status: o.status,
        tableNumber: o.tableNumber,
        total: o.total || 0,
        customerName: o.customerName,
        createdAt: o.createdAt,
        items: o.items?.map((it) => ({
          name: it.mealTitle,
          qty: it.quantity,
          price: it.price,
        })),
      })),
      expenses: shift.expenses.map(e => ({
        title: e.description || '',
        amount: e.amount || 0,
        category: e.category || 'عام',
        addedBy: e.createdBy || '',
        createdAt: e.createdAt
      })),
      totalRevenue,
      totalExpenses,
      netRevenue
    })

    // 4. حذف جميع الأوردرات الخاصة بهذه الوردية نهائياً عشان الترقيم يبدأ من 1 في الوردية الجديدة
    await db.order.deleteMany({ where: { shiftId: id } })

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
