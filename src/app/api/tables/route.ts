import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/tables - List all tables
export async function GET() {
  try {
    const tables = await db.restaurantTable.findMany({
      orderBy: [{ area: 'asc' }, { number: 'asc' }],
    })
    return NextResponse.json(tables)
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
  }
}

// POST /api/tables - Create a new table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { number, name, seats, area } = body

    if (!number) {
      return NextResponse.json({ error: 'Table number is required' }, { status: 400 })
    }

    // Generate a random 6-digit secret code
    const secretCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const table = await db.restaurantTable.create({
      data: {
        number: parseInt(String(number)),
        name: name || '',
        secretCode,
        seats: parseInt(String(seats)) || 4,
        area: area || 'صالة رئيسية',
      },
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'رقم الطاولة موجود بالفعل في هذه المنطقة' }, { status: 409 })
    }
    console.error('Error creating table:', error)
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 })
  }
}

// POST /api/tables/validate - Validate a table's secret code
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { number, secretCode } = body

    if (!number || !secretCode) {
      return NextResponse.json({ error: 'Table number and secret code are required' }, { status: 400 })
    }

    const table = await db.restaurantTable.findFirst({
      where: {
        number: parseInt(String(number)),
        secretCode: secretCode.toUpperCase(),
        isActive: true,
      },
    })

    if (!table) {
      return NextResponse.json({ valid: false, error: 'كود الطاولة غير صحيح' }, { status: 403 })
    }

    return NextResponse.json({ valid: true, table: { number: table.number, name: table.name, seats: table.seats } })
  } catch (error) {
    console.error('Error validating table:', error)
    return NextResponse.json({ error: 'Failed to validate table' }, { status: 500 })
  }
}
