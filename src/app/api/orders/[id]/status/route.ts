import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // تحديث الطلب في قاعدة البيانات
    // نقبل الحقول الديناميكية مثل status, kitchenAccess, baristaStatus, kitchenStatus
    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        ...body,
        // إذا تم تأكيد الطلب، نحدث وقت التحديث
        updatedAt: new Date(),
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'فشل في تحديث حالة الطلب. تأكد من صحة البيانات.' },
      { status: 500 }
    )
  }
}