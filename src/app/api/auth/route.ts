import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'

// ⚠️ SECURITY NOTE: Passwords are stored as plain text in the DB.
// For production, migrate to bcrypt hashing:
//   1. Add bcryptjs to dependencies
//   2. Hash passwords on creation: await bcrypt.hash(password, 12)
//   3. Compare: await bcrypt.compare(password, admin.password)

function safeCompare(a: string, b: string): boolean {
  try {
    // Pad to same length to prevent timing attacks
    const aBuf = Buffer.from(createHash('sha256').update(a).digest('hex'))
    const bBuf = Buffer.from(createHash('sha256').update(b).digest('hex'))
    return timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

// POST /api/auth - Admin login
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({ where: { username } })

    if (!admin || !safeCompare(password, admin.password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!admin.isActive) {
      return NextResponse.json({ error: 'الحساب غير نشط' }, { status: 403 })
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
