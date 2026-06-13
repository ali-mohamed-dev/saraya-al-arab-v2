import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where = activeOnly ? { isActive: true } : {}
    const categories = await db.expenseCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isActive: true },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching expense categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, isActive } = body
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }
    const existing = await db.expenseCategory.findUnique({ where: { name: name.trim() } })
    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
    }
    const cat = await db.expenseCategory.create({
      data: { name: name.trim(), isActive: isActive !== undefined ? isActive : true },
    })
    return NextResponse.json(cat, { status: 201 })
  } catch (error) {
    console.error('Error creating expense category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
