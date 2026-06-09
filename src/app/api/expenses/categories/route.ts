import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const expenses = await db.expense.findMany({
      select: { category: true },
      distinct: ['category'],
    })
    const categories = expenses.map(e => e.category).filter(Boolean).sort()
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching expense categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
