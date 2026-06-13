import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, { status: 400 })
    const user = await db.webUser.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'البريد الإلكتروني غير مسجل' }, { status: 401 })
    if (user.isBlocked) return NextResponse.json({ error: 'هذا الحساب محظور' }, { status: 403 })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, picture: user.picture, totalSpent: user.totalSpent, pointsBalance: user.pointsBalance })
  } catch (error) { console.error('web-user login error:', error); return NextResponse.json({ error: 'فشل تسجيل الدخول' }, { status: 500 }) }
}
