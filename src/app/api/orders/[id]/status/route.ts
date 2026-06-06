import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { releasePhoneOrder } from '@/lib/saraya/rate-limit'

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY', 'DELIVERED', 'CANCELLED']

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['READY_TO_PAY', 'CANCELLED'],
  READY_TO_PAY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],  // terminal state
  CANCELLED: [],  // terminal state
}

// PUT /api/orders/[id]/status
// تحديث حالة الطلب مع التحقق من صحة الانتقالات
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status, kitchenAccess } = await request.json()

    // 1. التحقق من صحة الحالة
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'حالة الطلب غير صحيحة' }, { status: 400 })
    }

    // 2. التحقق من وجود الطلب أولاً
    const order = await db.order.findUnique({ where: { id } })

    if (!order) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    }

    // 3. التحقق من صحة انتقال الحالة
    const allowedNext = VALID_TRANSITIONS[order.status] || []
    if (!allowedNext.includes(status)) {
      return NextResponse.json(
        { error: `لا يمكن تغيير حالة الطلب من ${order.status} إلى ${status}` },
        { status: 400 }
      )
    }

    // 4. تحديث حالة الطلب
    const updateData: Record<string, unknown> = {
      status,
      kitchenAccess: kitchenAccess !== undefined ? kitchenAccess : undefined,
    }

    // عند التأكيد: تفعيل وصول المطبخ تلقائياً
    if (status === 'CONFIRMED') {
      updateData.kitchenAccess = true
      updateData.kitchenStatus = 'CONFIRMED'
      updateData.baristaStatus = 'CONFIRMED'
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
    })

    // 5. إذا تم التسليم: تحديث إيرادات الشيفت
    if (status === 'DELIVERED' && order.shiftId) {
      await recalculateShiftRevenue(order.shiftId)
      // تحرير خانة الرات ليميت للهاتف
      if (order.customerPhone) {
        releasePhoneOrder(order.customerPhone)
      }
    }

    // 6. إذا تم الإلغاء: تحرير خانة الرات ليميت للهاتف
    if (status === 'CANCELLED' && order.customerPhone) {
      releasePhoneOrder(order.customerPhone)
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Update order status error:', error)
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }
}

// Helper: إعادة حساب إيرادات الشيفت
async function recalculateShiftRevenue(shiftId: string) {
  try {
    const orders = await db.order.findMany({
      where: { shiftId, status: 'DELIVERED' },
      select: { total: true },
    })
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)

    const expenses = await db.expense.findMany({
      where: { shiftId },
      select: { amount: true },
    })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    await db.shift.update({
      where: { id: shiftId },
      data: {
        totalRevenue,
        totalExpenses,
        netRevenue: totalRevenue - totalExpenses,
      },
    })
  } catch (error) {
    console.error('Error recalculating shift revenue:', error)
  }
}
