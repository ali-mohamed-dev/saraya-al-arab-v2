import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

// PUT /api/shifts/[id] - close a shift with summary
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireRole(request, ['ADMIN', 'CASHIER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
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
      select: { total: true, discountAmount: true, discountType: true },
    })
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)

    // ── Discounts (FIX: previously only calculated in export-and-clear,
    // leaving these fields at 0 if a shift was closed via this endpoint) ──
    const totalDiscounts = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0)
    const totalLoyaltyDiscounts = orders
      .filter(o => o.discountType === 'POINTS')
      .reduce((sum, o) => sum + (o.discountAmount || 0), 0)

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
        totalDiscounts,
        totalLoyaltyDiscounts,
        notes: notes || null,
      },
    })

    // لا نمسح الأوردرات بعد إغلاق الشيفت — البيانات التاريخية مهمة للتقارير
    // رقم الطلب (orderNumber) بيبدأ من 1 لكل شيفت جديد عشان الـ unique constraint على [shiftId, orderNumber]

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

    // حساب الإحصائيات الحية للشيفت المفتوح
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED')
    const liveTotalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0)
    const liveTotalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const liveNetRevenue = liveTotalRevenue - liveTotalExpenses
    const liveTotalDiscounts = deliveredOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0)

    // لو الشيفت مفتوح، نرجع الأرقام الحية؛ لو مقفول، نرجع الأرقام المحفوظة
    const shiftData = shift.status === 'OPEN' ? {
      ...shift,
      totalRevenue: liveTotalRevenue,
      totalExpenses: liveTotalExpenses,
      netRevenue: liveNetRevenue,
      totalDiscounts: liveTotalDiscounts,
    } : shift

    return NextResponse.json({ shift: shiftData, orders, expenses })
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 })
  }
}
