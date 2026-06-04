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
    // FIX: schema uses 'description' and 'createdBy', not 'title' and 'addedBy'
    const { title, description, amount, category, shiftId, addedBy, createdBy } = body

    const resolvedDescription = description || title  // accept both for compatibility
    const resolvedCreatedBy = createdBy || addedBy || ''

    if (!resolvedDescription || !amount) {
      return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 })
    }

    const expense = await db.expense.create({
      data: {
        description: resolvedDescription,   // FIX: was 'title' (field doesn't exist in schema)
        amount: parseFloat(amount),
        category: category || 'عام',
        shiftId: shiftId || null,
        createdBy: resolvedCreatedBy,       // FIX: was 'addedBy' (field doesn't exist in schema)
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
