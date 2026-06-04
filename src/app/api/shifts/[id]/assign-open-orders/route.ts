import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ربط أي طلبات نشطة ليس لها shiftId بالوردية الحالية
    const result = await db.order.updateMany({
      where: {
        shiftId: null,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      data: {
        shiftId: id,
      },
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error('Error assigning orders to shift:', error)
    return NextResponse.json({ error: 'Failed to assign orders' }, { status: 500 })
  }
}