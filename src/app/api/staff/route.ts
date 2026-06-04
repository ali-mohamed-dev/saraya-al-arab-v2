import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// جلب قائمة الموظفين
export async function GET() {
  try {
    const staff = await db.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true }
    })
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff fetch error:', error)
    return NextResponse.json({ error: 'فشل في جلب الموظفين' }, { status: 500 })
  }
}

// إضافة موظف جديد
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // FIX: trim whitespace before validation to prevent ghost usernames
    const username = (body.username || '').trim()
    const password = (body.password || '').trim()
    const role     = (body.role     || '').trim()

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
    }

    const validRoles = ['ADMIN', 'WAITER', 'CASHIER', 'KITCHEN', 'BARISTA']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'صلاحية غير صالحة' }, { status: 400 })
    }

    // FIX: return 409 Conflict (not 400) for duplicate username so frontend can handle it distinctly
    const existing = await db.admin.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم موجود بالفعل، جرب اسماً آخر' }, { status: 409 })
    }

    const staff = await db.admin.create({
      data: { username, password, role }
    })

    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('Staff creation error:', error)
    return NextResponse.json({ error: 'فشل في إضافة الموظف' }, { status: 500 })
  }
}
