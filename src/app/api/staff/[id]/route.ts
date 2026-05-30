import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/staff/[id] - update staff role or password
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { role, password } = body

    const updateData: Record<string, string> = {}
    if (role) updateData.role = role
    if (password) updateData.password = password

    const staff = await db.admin.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, role: true, createdAt: true },
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Error updating staff:', error)
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
  }
}

// DELETE /api/staff/[id] - delete staff member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.admin.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting staff:', error)
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
  }
}
