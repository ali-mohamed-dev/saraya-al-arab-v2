import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const users = await db.webUser.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(users.map(u => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, picture: u.picture, isBlocked: u.isBlocked, totalSpent: u.totalSpent, pointsBalance: u.pointsBalance, createdAt: u.createdAt })))
  } catch (error) { console.error('web-users GET error:', error); return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    const exists = await db.webUser.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    const hashed = await bcrypt.hash(password, 10)
    const user = await db.webUser.create({
      data: { email, password: hashed, name: name || '', phone: phone || '' },
    })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, phone: user.phone }, { status: 201 })
  } catch (error) { console.error('web-users POST error:', error); return NextResponse.json({ error: 'Failed to create user' }, { status: 500 }) }
}
