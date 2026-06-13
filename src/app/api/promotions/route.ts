import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

// GET /api/promotions - Fetch promotions (with related meals)
// Supports ?active=true to filter only active promotions, ?page=1&limit=50 for pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    const where = activeOnly ? { isActive: true } : undefined
    const select = { id: true, bannerImageUrl: true, title: true, titleAr: true, description: true, descriptionAr: true, price: true, oldPrice: true, discount: true, isActive: true, buttonText: true, buttonTextAr: true, buttonLink: true, createdAt: true, mealItems: { select: { id: true, mealId: true, meal: { select: { id: true, title: true, titleAr: true, description: true, descriptionAr: true, price: true, prepTime: true, category: true, categoryAr: true, preparationArea: true, imageUrl: true, isActive: true } } } } }

    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))
      const skip = (pageNum - 1) * limitNum
      const [promotions, total] = await Promise.all([
        db.promotion.findMany({ where, orderBy: { createdAt: 'desc' }, select, skip, take: limitNum }),
        db.promotion.count({ where }),
      ])
      return NextResponse.json({ data: promotions, total, page: pageNum, totalPages: Math.ceil(total / limitNum) }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
    }

    const promotions = await db.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select,
      take: 100,
    })
    return NextResponse.json(promotions, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
  } catch (error) {
    console.error('Error fetching promotions:', error)
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
  }
}

// POST /api/promotions - Create a new promotion
export async function POST(request: NextRequest) {
  if (!requireRole(request, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
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