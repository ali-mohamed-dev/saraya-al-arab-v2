import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireRole(request, ['CASHIER', 'ADMIN'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, amount, category, employeeId } = body

    const resolvedDescription = description || title

    const updateData: Record<string, unknown> = {}
    if (resolvedDescription) updateData.description = resolvedDescription
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount)
      // FIX: Reject negative expense amounts
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'المبلغ يجب أن يكون رقم موجب' }, { status: 400 })
      }
      updateData.amount = parsedAmount
    }
    if (category) updateData.category = category
    if ('employeeId' in body) updateData.employeeId = employeeId || null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Server-side cash validation when updating a shift expense amount
    if (updateData.amount !== undefined && existing.shiftId) {
      const [shiftOrders, shiftExpenses] = await Promise.all([
        db.order.findMany({
          where: { shiftId: existing.shiftId, status: 'DELIVERED' },
          select: { total: true },
        }),
        db.expense.findMany({
          where: { shiftId: existing.shiftId },
          select: { id: true, amount: true },
        }),
      ])
      const shiftRevenue = shiftOrders.reduce((s, o) => s + o.total, 0)
      const otherExpenses = shiftExpenses
        .filter(e => e.id !== id)
        .reduce((s, e) => s + e.amount, 0)
      const availableCash = shiftRevenue - otherExpenses
      const newAmount = updateData.amount as number
      if (newAmount > availableCash) {
        return NextResponse.json({
          error: `لا يمكن تعديل المصروف إلى ${newAmount.toFixed(2)} ج.م. السيولة المتاحة ${Math.max(0, availableCash).toFixed(2)} ج.م فقط.`,
        }, { status: 400 })
      }
    }

    const expense = await db.expense.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      ...expense,
      title: expense.description,
      addedBy: expense.createdBy,
    })
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireRole(request, ['CASHIER', 'ADMIN'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const { id } = await params
    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    await db.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}