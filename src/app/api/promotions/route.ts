import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/promotions - Fetch all promotions
export async function GET() {
  try {
    const promotions = await db.promotion.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(promotions)
  } catch (error) {
    console.error('Error fetching promotions:', error)
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
  }
}

// POST /api/promotions - Create a new promotion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bannerImageUrl, title, titleAr, isActive } = body

    if (!bannerImageUrl) {
      return NextResponse.json({ error: 'Banner image URL is required' }, { status: 400 })
    }

    const promotion = await db.promotion.create({
      data: {
        bannerImageUrl,
        title: title || '',
        titleAr: titleAr || '',
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json(promotion, { status: 201 })
  } catch (error) {
    console.error('Error creating promotion:', error)
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 })
  }
}
