import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/promotions/[id] - Update a promotion
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.promotion.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.bannerImageUrl !== undefined) updateData.bannerImageUrl = body.bannerImageUrl
    if (body.title          !== undefined) updateData.title          = body.title
    if (body.titleAr        !== undefined) updateData.titleAr        = body.titleAr
    if (body.description    !== undefined) updateData.description    = body.description
    if (body.descriptionAr  !== undefined) updateData.descriptionAr  = body.descriptionAr
    if (body.price          !== undefined) updateData.price          = parseFloat(body.price)
    if (body.oldPrice       !== undefined) updateData.oldPrice       = parseFloat(body.oldPrice)
    if (body.discount       !== undefined) updateData.discount       = parseInt(body.discount)
    if (body.buttonText     !== undefined) updateData.buttonText     = body.buttonText
    if (body.buttonTextAr   !== undefined) updateData.buttonTextAr   = body.buttonTextAr
    if (body.buttonLink     !== undefined) updateData.buttonLink     = body.buttonLink
    if (body.isActive       !== undefined) updateData.isActive       = body.isActive

    // تحديث الوجبات المرتبطة إذا تم إرسال mealIds
    if (Array.isArray(body.mealIds)) {
      await db.promotionMeal.deleteMany({ where: { promotionId: id } })
      if (body.mealIds.length > 0) {
        await db.promotionMeal.createMany({
          data: [...new Set<string>(body.mealIds)].map((mealId) => ({ promotionId: id, mealId })),
          skipDuplicates: true,
        })
      }
    }

    const promotion = await db.promotion.update({
      where: { id },
      data: updateData,
      include: {
        mealItems: { include: { meal: true } },
      },
    })

    return NextResponse.json(promotion)
  } catch (error) {
    console.error('Error updating promotion:', error)
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 })
  }
}

// DELETE /api/promotions/[id] - Delete a promotion
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.promotion.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    await db.promotion.delete({ where: { id } })

    return NextResponse.json({ message: 'Promotion deleted successfully' })
  } catch (error) {
    console.error('Error deleting promotion:', error)
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 })
  }
}
