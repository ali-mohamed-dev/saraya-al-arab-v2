import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/promotions - Fetch promotions (with related meals)
// Supports ?active=true to filter only active promotions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const promotions = await db.promotion.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' },
      select: { id: true, bannerImageUrl: true, title: true, titleAr: true, description: true, descriptionAr: true, price: true, oldPrice: true, discount: true, isActive: true, buttonText: true, buttonTextAr: true, buttonLink: true, createdAt: true, mealItems: { select: { id: true, mealId: true, meal: { select: { id: true, title: true, titleAr: true, description: true, descriptionAr: true, price: true, prepTime: true, category: true, categoryAr: true, preparationArea: true, imageUrl: true, isActive: true } } } } },
    })
    return NextResponse.json(promotions, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
  } catch (error) {
    console.error('Error fetching promotions:', error)
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
  }
}

// POST /api/promotions - Create a new promotion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bannerImageUrl,
      title,
      titleAr,
      description,
      descriptionAr,
      price,
      oldPrice,
      discount,
      mealIds,
      buttonText,
      buttonTextAr,
      buttonLink,
      isActive,
    } = body

    if (!bannerImageUrl || (!title && !titleAr)) {
      return NextResponse.json(
        { error: 'صورة العرض والعنوان (بالعربي أو الإنجليزي) مطلوبان' },
        { status: 400 }
      )
    }

    const parsedPrice    = parseFloat(String(price    ?? 0)) || 0
    const parsedOldPrice = parseFloat(String(oldPrice ?? 0)) || 0
    const parsedDiscount = parseInt(String(discount   ?? 0)) || 0

    const promotion = await db.promotion.create({
      data: {
        bannerImageUrl,
        title:        title        || '',
        titleAr:      titleAr      || '',
        description:  description  || '',
        descriptionAr: descriptionAr || '',
        price:        parsedPrice,
        oldPrice:     parsedOldPrice,
        discount:     parsedDiscount,
        buttonText:   buttonText   || '',
        buttonTextAr: buttonTextAr || '',
        buttonLink:   buttonLink   || '',
        isActive:     isActive !== undefined ? isActive : true,
        mealItems:
          Array.isArray(mealIds) && mealIds.length > 0
            ? { create: mealIds.map((mealId: string) => ({ mealId })) }
            : undefined,
      },
      include: {
        mealItems: { include: { meal: true } },
      },
    })

    return NextResponse.json(promotion, { status: 201 })
  } catch (error) {
    console.error('Error creating promotion:', error)
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 })
  }
}