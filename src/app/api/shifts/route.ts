import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/shifts - get all shifts or current open shift
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current')

    if (current === 'true') {
      let shift = await db.shift.findFirst({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
      })

      // Auto-migrate legacy shifts with old status values ('active'/'closed')
      if (!shift) {
        const legacyOpen = await db.shift.findFirst({
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
        })
        if (legacyOpen) {
          shift = await db.shift.update({
            where: { id: legacyOpen.id },
            data: { status: 'OPEN' },
          })
          // Also fix all 'closed' shifts
          await db.shift.updateMany({
            where: { status: 'closed' },
            data: { status: 'CLOSED' },
          })
        }
      }

      return NextResponse.json(shift || null)
    }

    const shifts = await db.shift.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

// POST /api/shifts - start a new shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startedBy } = body

    // Close any open shifts first
    await db.shift.updateMany({
      where: { status: 'OPEN' },
      data: { status: 'CLOSED', endedAt: new Date() },
    })

    const shift = await db.shift.create({
      data: {
        startedBy: startedBy || 'admin',
        status: 'OPEN',
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  }
}
