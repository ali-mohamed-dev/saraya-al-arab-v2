import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const attendances = await db.attendance.findMany({
      orderBy: { date: 'desc' },
      include: { employee: { select: { name: true } } },
    })
    return NextResponse.json(attendances)
  } catch (error) {
    console.error('Error fetching attendances:', error)
    return NextResponse.json({ error: 'Failed to fetch attendances' }, { status: 500 })
  }
}
