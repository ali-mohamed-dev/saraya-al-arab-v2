import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// POST /api/auth - Admin login
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({ where: { username } })

    // bcrypt.compare handles timing-safe comparison internally
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!admin.isActive) {
      return NextResponse.json({ error: 'الحساب غير نشط' }, { status: 403 })
    }

    const response = NextResponse.json({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      authenticated: true,
    })
    response.cookies.set('saraya-staff-auth', 'true', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    })
    response.cookies.set('saraya-staff-role', admin.role, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Error during login:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
