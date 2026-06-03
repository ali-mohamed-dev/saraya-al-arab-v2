import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/meals - Fetch all meals
export async function GET() {
  try {
    const meals = await db.meal.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(meals)
  } catch (error) {
    console.error('Error fetching meals:', error)
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 })
  }
}

// POST /api/meals - Create a new meal
export async function POST(request: NextRequest) {
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
