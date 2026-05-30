import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/staff - list all staff (non-admin can only list)
export async function GET() {
  try {
    const staff = await db.admin.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

// POST /api/staff - create new staff member (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, role } = body

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Username, password and role are required' }, { status: 400 })
    }

    const validRoles = ['ADMIN', 'WAITER', 'CASHIER', 'KITCHEN']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if username already exists
    const existing = await db.admin.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const staff = await db.admin.create({
      data: { username, password, role },
      select: { id: true, username: true, role: true, createdAt: true },
    })

    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }
}
