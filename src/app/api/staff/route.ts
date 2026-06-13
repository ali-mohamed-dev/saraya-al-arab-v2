import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireRole } from '@/lib/auth'

// جلب قائمة الموظفين
export async function GET() {
  try {
    const staff = await db.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true }
    })
    console.log(`[Staff API] Found ${staff.length} admin records:`, staff.map(s => s.username))
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff fetch error:', error)
    return NextResponse.json({ error: 'فشل في جلب الموظفين' }, { status: 500 })
  }
}

// إضافة موظف جديد
export async function POST(req: NextRequest) {
  if (!requireRole(req, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()

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

    const existing = await db.admin.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم موجود بالفعل، جرب اسماً آخر' }, { status: 409 })
    }

    // hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 12)

    const staff = await db.admin.create({
      data: { username, password: hashedPassword, role }
    })

    // never return the hashed password to the client
    const { password: _omit, ...safeStaff } = staff
    return NextResponse.json(safeStaff, { status: 201 })
  } catch (error) {
    console.error('Staff creation error:', error)
    return NextResponse.json({ error: 'فشل في إضافة الموظف' }, { status: 500 })
  }
}
