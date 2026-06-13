import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
    const user = await db.webUser.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ exists: false, blocked: false, message: 'البريد الإلكتروني غير مسجل. الرجاء إنشاء حساب أولاً.' })
    if (user.isBlocked) return NextResponse.json({ exists: true, blocked: true, message: 'هذا الحساب محظور. لا يمكنك الطلب.' })
    const addresses = await db.address.findMany({ where: { userId: user.id }, select: { label: true, address: true } })
    return NextResponse.json({
      exists: true, blocked: false,
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, addresses }
    })
  } catch (error) { console.error('web-user check error:', error); return NextResponse.json({ error: 'Failed to check user' }, { status: 500 }) }
}
