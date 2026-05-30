import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/meals/[id]/addons - Fetch add-ons for a specific meal
// ?admin=true => returns all add-ons (including inactive) for admin panel
// default    => returns only active add-ons for the client menu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const isAdmin = request.nextUrl.searchParams.get('admin') === 'true'

    const addons = await db.mealAddOn.findMany({
      where: isAdmin ? { mealId: id } : { mealId: id, isActive: true },
      orderBy: { isRecommended: 'desc' },
    })

    return NextResponse.json(addons)
  } catch (error) {
    console.error('Error fetching meal add-ons:', error)
    return NextResponse.json({ error: 'Failed to fetch meal add-ons' }, { status: 500 })
  }
}
