import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/tables/verify - Validate a table's secret code (used by client menu)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableNumber, code } = body

    if (!tableNumber || !code) {
      return NextResponse.json(
        { valid: false, message: 'رقم الطاولة والكود مطلوبان' },
        { status: 400 }
      )
    }

    const table = await db.restaurantTable.findFirst({
      where: {
        number: parseInt(String(tableNumber)),
        secretCode: String(code).toUpperCase(),
        isActive: true,
      },
    })

    if (!table) {
      return NextResponse.json(
        { valid: false, message: 'كود الطاولة غير صحيح' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      valid: true,
      table: { number: table.number, name: table.name, seats: table.seats },
    })
  } catch (error) {
    console.error('Error validating table:', error)
    return NextResponse.json(
      { valid: false, message: 'حدث خطأ في التحقق من الطاولة' },
      { status: 500 }
    )
  }
}