import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// جلب قائمة الموظفين
export async function GET() {
  try {
    const staff = await db.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, role: true, createdAt: true }
    })
    return NextResponse.json(staff)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الموظفين' }, { status: 500 })
  }
}

// إضافة موظف جديد
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password, role } = body
    
    if (!username || !password || !role) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
    }

    // السماح بصلاحية BARISTA الجديدة هنا لكي لا يعطي الخطأ 400
    const validRoles = ['ADMIN', 'WAITER', 'CASHIER', 'KITCHEN', 'BARISTA']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'صلاحية غير صالحة' }, { status: 400 })
    }

    // التأكد من عدم تكرار اسم المستخدم
    const existing = await db.admin.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم موجود بالفعل' }, { status: 400 })
    }

    const staff = await db.admin.create({
      data: {
        username,
        password, // ملاحظة: يفضل تشفير كلمة المرور في المشاريع الحقيقية
        role
      }
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff creation error:', error)
    return NextResponse.json({ error: 'فشل في إضافة الموظف' }, { status: 500 })
  }
}