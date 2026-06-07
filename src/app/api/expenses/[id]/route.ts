import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, amount, category } = body

    const resolvedDescription = description || title

    const updateData: Record<string, unknown> = {}
    if (resolvedDescription) updateData.description = resolvedDescription
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (category) updateData.category = category

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}