import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// تعديل بيانات موظف
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { role, password } = body
    
    const data: Record<string, any> = {}
    
    if (role) {
      const validRoles = ['ADMIN', 'WAITER', 'CASHIER', 'KITCHEN', 'BARISTA']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'صلاحية غير صالحة' }, { status: 400 })
      }
      data.role = role
    }
    
    if (password) {
      data.password = password
    }

    const staff = await db.admin.update({
      where: { id },
      data
    })

    return NextResponse.json(staff)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث بيانات الموظف' }, { status: 500 })
  }
}

// حذف موظف
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // منع حذف حساب الأدمن الأساسي (اختياري لكن يفضل)
    const target = await db.admin.findUnique({ where: { id } })
    if (target?.username === 'admin') {
      return NextResponse.json({ error: 'لا يمكن حذف حساب المدير الرئيسي' }, { status: 400 })
    }

    await db.admin.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الموظف' }, { status: 500 })
  }
}
