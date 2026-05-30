import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/addons/[id] - Update an add-on
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.mealAddOn.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.titleAr !== undefined) updateData.titleAr = body.titleAr
    if (body.price !== undefined) updateData.price = parseFloat(body.price)
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl
    if (body.isRecommended !== undefined) updateData.isRecommended = body.isRecommended
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const addon = await db.mealAddOn.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(addon)
  } catch (error) {
    console.error('Error updating add-on:', error)
    return NextResponse.json({ error: 'Failed to update add-on' }, { status: 500 })
  }
}

// DELETE /api/addons/[id] - Delete an add-on
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.mealAddOn.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 })
    }

    await db.mealAddOn.delete({ where: { id } })

    return NextResponse.json({ message: 'Add-on deleted successfully' })
  } catch (error) {
    console.error('Error deleting add-on:', error)
    return NextResponse.json({ error: 'Failed to delete add-on' }, { status: 500 })
  }
}
