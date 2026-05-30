import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/meals/[id] - Update a meal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existingMeal = await db.meal.findUnique({ where: { id } })
    if (!existingMeal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.titleAr !== undefined) updateData.titleAr = body.titleAr
    if (body.description !== undefined) updateData.description = body.description
    if (body.descriptionAr !== undefined) updateData.descriptionAr = body.descriptionAr
    if (body.price !== undefined) updateData.price = parseFloat(body.price)
    if (body.prepTime !== undefined) updateData.prepTime = body.prepTime
    if (body.category !== undefined) updateData.category = body.category
    if (body.categoryAr !== undefined) updateData.categoryAr = body.categoryAr
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const meal = await db.meal.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(meal)
  } catch (error) {
    console.error('Error updating meal:', error)
    return NextResponse.json({ error: 'Failed to update meal' }, { status: 500 })
  }
}

// DELETE /api/meals/[id] - Delete a meal
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingMeal = await db.meal.findUnique({ where: { id } })
    if (!existingMeal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }

    await db.meal.delete({ where: { id } })

    return NextResponse.json({ message: 'Meal deleted successfully' })
  } catch (error) {
    console.error('Error deleting meal:', error)
    return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 })
  }
}
