import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/auth - Admin login
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({ where: { username } })

    if (!admin || admin.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      authenticated: true,
    })
  } catch (error) {
    console.error('Error during login:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
