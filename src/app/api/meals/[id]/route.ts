import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { price, imageUrl, preparationArea, isActive } = body

    const updatedMeal = await db.meal.update({
      where: { id },
      data: {
        // نقوم بتحديث الحقول المرسلة فقط
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(preparationArea !== undefined && { preparationArea: preparationArea as any }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(updatedMeal)
  } catch (error) {
    console.error('Error updating meal:', error)
    return NextResponse.json(
      { error: 'Failed to update meal' },
      { status: 500 }
    )
  }
}