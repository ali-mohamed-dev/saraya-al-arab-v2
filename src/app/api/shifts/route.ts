import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/shifts - get all shifts or current open shift
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current')

    // توحيد البحث عن الشيفت الحالي أو جلب الكل في محاولة واحدة لمنع تكرار الكود
    if (current === 'true') {
      const shift = await db.shift.findFirst({
        // استخدام 'as any' مؤقتاً لتجنب انهيار النوع إذا كانت قاعدة البيانات تحتوي على قيم قديمة
        where: { status: { in: ['OPEN', 'active'] } as any },
        orderBy: { createdAt: 'desc' },
      })
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

    // إغلاق أي وردية مفتوحة أولاً لضمان عدم وجود تكرار (OPEN أو active)
    await db.shift.updateMany({
      where: { status: { in: ['OPEN', 'active'] } as any },
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
