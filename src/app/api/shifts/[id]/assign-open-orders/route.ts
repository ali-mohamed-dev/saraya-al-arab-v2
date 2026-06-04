import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/shifts/[id]/assign-open-orders
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const shift = await db.shift.findUnique({ where: { id } })
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const result = await db.order.updateMany({
      where: {
        shiftId: null,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      data: { shiftId: id },
    })

    return NextResponse.json({ assigned: result.count })
  } catch (error) {
    console.error('assign-open-orders error:', error)
    return NextResponse.json({ error: 'Failed to assign orders' }, { status: 500 })
  }
}
