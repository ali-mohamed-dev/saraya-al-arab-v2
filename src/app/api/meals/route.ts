import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

// GET /api/meals - Fetch all meals (supports ?page=1&limit=50 for pagination)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50))
      const skip = (pageNum - 1) * limitNum
      const [meals, total] = await Promise.all([
        db.meal.findMany({
          select: { id: true, title: true, titleAr: true, description: true, descriptionAr: true, price: true, prepTime: true, category: true, categoryAr: true, preparationArea: true, imageUrl: true, isActive: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        db.meal.count(),
      ])
      return NextResponse.json({ data: meals, total, page: pageNum, totalPages: Math.ceil(total / limitNum) })
    }
    const meals = await db.meal.findMany({
      select: { id: true, title: true, titleAr: true, description: true, descriptionAr: true, price: true, prepTime: true, category: true, categoryAr: true, preparationArea: true, imageUrl: true, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(meals)
  } catch (error) {
    console.error('Error fetching meals:', error)
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 })
  }
}

// POST /api/meals - Create a new meal
export async function POST(request: NextRequest) {
  if (!requireRole(request, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { title, titleAr, description, descriptionAr, price, prepTime, category, categoryAr, preparationArea, imageUrl } = body

    if (!title || price === undefined) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 })
    }

    const meal = await db.meal.create({
      data: {
        title,
        titleAr: titleAr || '',
        description: description || '',
        descriptionAr: descriptionAr || '',
        price: parseFloat(price),
        prepTime: prepTime || '15 دقيقة',
        category: category || 'مشويات',
        preparationArea: preparationArea || 'KITCHEN',
        categoryAr: categoryAr || '',
        imageUrl: imageUrl || '',
      },
    })

    return NextResponse.json(meal, { status: 201 })
  } catch (error) {
    console.error('Error creating meal:', error)
    return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 })
  }
}
