import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/shifts/[id] - close a shift with summary
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { endedBy, notes } = body

    // التحقق من وجود الشيفت وأنه مفتوح
    const shift = await db.shift.findUnique({ where: { id } })
    if (!shift) {
      return NextResponse.json({ error: 'الشيفت غير موجود' }, { status: 404 })
    }
    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'الشيفت مغلق بالفعل' }, { status: 400 })
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

    // Calculate revenue from DELIVERED orders in this shift
    const orders = await db.order.findMany({
      where: { shiftId: id, status: 'DELIVERED' },
      select: { total: true },
    })
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)

    // Calculate total expenses for this shift
    const expenses = await db.expense.findMany({
      where: { shiftId: id },
      select: { amount: true },
    })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const netRevenue = totalRevenue - totalExpenses

    const updatedShift = await db.shift.update({
      where: { id },
      data: {
        status: 'CLOSED',
        endedAt: new Date(),
        endedBy: endedBy || null,
        totalRevenue,
        totalExpenses,
        netRevenue,
        notes: notes || null,
      },
    })

    // حذف جميع الأوردرات الخاصة بهذه الوردية نهائياً عشان الترقيم يبدأ من 1 في الوردية الجديدة
    await db.order.deleteMany({ where: { shiftId: id } })

    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error('Error closing shift:', error)
    return NextResponse.json({ error: 'Failed to close shift' }, { status: 500 })
  }
}

// GET /api/shifts/[id] - get shift details with orders and expenses
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const shift = await db.shift.findUnique({ where: { id } })
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const orders = await db.order.findMany({
      where: { shiftId: id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    const expenses = await db.expense.findMany({
      where: { shiftId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ shift, orders, expenses })
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 })
  }
}
