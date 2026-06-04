import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/addons - Fetch all add-ons (or filter by mealId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mealId = searchParams.get('mealId')

    const where = mealId ? { mealId } : {}
    const addons = await db.addOn.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(addons)
  } catch (error) {
    console.error('Error fetching add-ons:', error)
    return NextResponse.json({ error: 'Failed to fetch add-ons' }, { status: 500 })
  }
}

// POST /api/addons - Create a new add-on
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mealId, title, titleAr, price, imageUrl, isRecommended } = body

    if (!mealId || !title || price === undefined) {
      return NextResponse.json({ error: 'mealId, title, and price are required' }, { status: 400 })
    }

    const addon = await db.addOn.create({
      data: {
        mealId,
        title,
        titleAr: titleAr || '',
        price: parseFloat(price),
        imageUrl: imageUrl || '',
        isRecommended: isRecommended || false,
        isActive: true,
      },
    })

    return NextResponse.json(addon, { status: 201 })
  } catch (error) {
    console.error('Error creating add-on:', error)
    return NextResponse.json({ error: 'Failed to create add-on' }, { status: 500 })
  }
}