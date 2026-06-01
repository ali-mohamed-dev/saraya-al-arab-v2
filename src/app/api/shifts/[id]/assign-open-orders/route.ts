import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

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

    const updated = await db.order.updateMany({
      where: {
        shiftId: '',
        createdAt: {
          gte: shift.startedAt,
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY', 'DELIVERED'],
        },
      },
      data: {
        shiftId: id,
      },
    })

    return NextResponse.json({ assigned: updated.count })
  } catch (error) {
    console.error('Error assigning open orders to shift:', error)
    return NextResponse.json({ error: 'Failed to assign orders to shift' }, { status: 500 })
  }
}
