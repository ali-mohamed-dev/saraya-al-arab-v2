import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const emp = await db.employee.findUnique({ where: { id } })
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const body = await request.json()
    let { date, type, notes, createdBy, quantity } = body
    if (!type || quantity === undefined) {
      return NextResponse.json({ error: 'Type and quantity are required' }, { status: 400 })
    }
    if (quantity < 0) {
      return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 })
    }
    if (!['VACATION', 'ABSENCE'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const att = await db.attendance.create({
      data: {
        employeeId: id,
        date: date ? new Date(date) : null,
        type,
        quantity,
        notes: notes || '',
        createdBy: createdBy || '',
      },
    })
    return NextResponse.json(att, { status: 201 })
  } catch (error: any) {
    console.error('Error creating attendance:', error)
    return NextResponse.json({ error: 'Failed to create attendance' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const attendanceId = request.nextUrl.searchParams.get('attendanceId')
    if (!attendanceId) {
      return NextResponse.json({ error: 'attendanceId query param required' }, { status: 400 })
    }
    await db.attendance.delete({ where: { id: attendanceId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting attendance:', error)
    return NextResponse.json({ error: 'Failed to delete attendance' }, { status: 500 })
  }
}
