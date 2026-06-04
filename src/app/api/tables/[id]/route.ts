import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/tables/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await db.restaurantTable.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting table:', error)
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 })
  }
}

// PATCH /api/tables/[id] - Update table (regenerate code, toggle active)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { regenerateCode, isActive, name, seats, area } = body

    const data: any = {}
    if (regenerateCode) {
      data.secretCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    }
    if (isActive !== undefined) data.isActive = isActive
    if (name !== undefined) data.name = name
    if (seats !== undefined) data.seats = parseInt(String(seats))
    if (area !== undefined) data.area = area

    const table = await db.restaurantTable.update({
      where: { id },
      data,
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error('Error updating table:', error)
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}
