import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/meals/[id] - Fetch a single meal
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const meal = await db.meal.findUnique({
      where: { id },
      include: { addons: true },
    })
    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }
    return NextResponse.json(meal)
  } catch (error) {
    console.error('Error fetching meal:', error)
    return NextResponse.json({ error: 'Failed to fetch meal' }, { status: 500 })
  }
}

// PUT /api/meals/[id] - Update a meal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      title, titleAr, description, descriptionAr,
      price, prepTime, category, categoryAr,
      preparationArea, imageUrl, isActive,
    } = body

    const updatedMeal = await db.meal.update({
      where: { id },
      data: {
        ...(title           !== undefined && { title }),
        ...(titleAr         !== undefined && { titleAr }),
        ...(description     !== undefined && { description }),
        ...(descriptionAr   !== undefined && { descriptionAr }),
        ...(price           !== undefined && { price: parseFloat(price) }),
        ...(prepTime        !== undefined && { prepTime }),
        ...(category        !== undefined && { category }),
        ...(categoryAr      !== undefined && { categoryAr }),
        ...(preparationArea !== undefined && { preparationArea }),
        ...(imageUrl        !== undefined && { imageUrl }),
        ...(isActive        !== undefined && { isActive }),
      },
    })

    return NextResponse.json(updatedMeal)
  } catch (error) {
    console.error('Error updating meal:', error)
    return NextResponse.json({ error: 'Failed to update meal' }, { status: 500 })
  }
}

// DELETE /api/meals/[id] - Delete a meal (was missing entirely)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.meal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting meal:', error)
    return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 })
  }
}
