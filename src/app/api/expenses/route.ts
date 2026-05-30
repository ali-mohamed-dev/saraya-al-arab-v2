import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')

    const where: Record<string, string> = {}
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
    const { title, amount, category, shiftId, addedBy } = body

    if (!title || !amount) {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 })
    }

    const expense = await db.expense.create({
      data: {
        title,
        amount: parseFloat(amount),
        category: category || 'عام',
        shiftId: shiftId || '',
        addedBy: addedBy || '',
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
