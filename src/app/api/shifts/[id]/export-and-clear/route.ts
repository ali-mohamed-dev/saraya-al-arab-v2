import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateShiftExcel } from '@/lib/saraya/excel-export'

// POST /api/shifts/[id]/export-and-clear
// هذا المسار مسؤول عن إنهاء الوردية وحساب الإيرادات النهائية
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { endedBy, notes } = await request.json()

    // 1. جلب بيانات الوردية الحالية مع الطلبات والمصاريف لحساب الأرقام النهائية
    const shift = await db.shift.findUnique({
      where: { id },
      include: {
        orders: { where: { status: 'DELIVERED' } },
        expenses: true,
      },
    })

    if (!shift) {
      return NextResponse.json({ error: 'الوردية غير موجودة' }, { status: 404 })
    }

    const totalRevenue = shift.orders.reduce((sum, o) => sum + o.total, 0)
    const totalExpenses = shift.expenses.reduce((sum, e) => sum + e.amount, 0)
    const netRevenue = totalRevenue - totalExpenses

    // 2. تحديث الوردية إلى حالة CLOSED (أو closed حسب قاعدة البيانات)
    // نستخدم 'as any' لتفادي تعارض أنواع الـ Enum القديمة والجديدة
    const updatedShift = await db.shift.update({
      where: { id },
      data: {
        status: 'CLOSED' as any,
        endedAt: new Date(),
        endedBy: endedBy || 'admin',
        notes: notes || '',
        totalRevenue,
        totalExpenses,
        netRevenue,
      },
    })

    // 3. توليد ملف الـ Excel
    const xlsxBuffer = await generateShiftExcel({
      shift: {
        startedAt: updatedShift.createdAt,
        endedAt: updatedShift.endedAt,
        startedBy: updatedShift.startedBy || 'admin',
        endedBy: updatedShift.endedBy,
        notes: updatedShift.notes,
      },
      orders: shift.orders.map(o => ({
        status: o.status,
        total: o.total || 0
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