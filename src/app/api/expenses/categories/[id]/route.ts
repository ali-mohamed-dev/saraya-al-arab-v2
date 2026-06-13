import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, isActive } = body
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
      }
      const existing = await db.expenseCategory.findUnique({ where: { name: name.trim() } })
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
      }
      updateData.name = name.trim()
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    const cat = await db.expenseCategory.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(cat)
  } catch (error) {
    console.error('Error updating expense category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.expenseCategory.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
