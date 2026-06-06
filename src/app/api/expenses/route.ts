import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')

    const where: any = {}
    if (shiftId) where.shiftId = shiftId

    const expenses = await db.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, amount, category, shiftId, addedBy, createdBy } = body

    const resolvedDescription = description || title
    const resolvedCreatedBy = createdBy || addedBy || ''

    if (!resolvedDescription || !amount) {
      return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 })
    }

    const parsedAmount = parseFloat(String(amount))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'المبلغ غير صحيح' }, { status: 400 })
    }

    // التحقق من أن الشيفت موجود ومفتوح
    if (shiftId) {
      const shift = await db.shift.findUnique({ where: { id: shiftId } })
      if (!shift) {
        return NextResponse.json({ error: 'الشيفت غير موجود' }, { status: 400 })
      }
      if (shift.status !== 'OPEN') {
        return NextResponse.json({ error: 'لا يمكن إضافة مصروف لشيفت مغلق' }, { status: 400 })
      }
    }

    const expense = await db.expense.create({
      data: {
        description: resolvedDescription,
        amount: parsedAmount,
        category: category || 'عام',
        shiftId: shiftId || null,
        createdBy: resolvedCreatedBy,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
