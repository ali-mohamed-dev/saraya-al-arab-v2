import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { label, address } = await request.json()
    const addr = await db.address.update({ where: { id }, data: { label: label || undefined, address: address || undefined } })
    return NextResponse.json(addr)
  } catch (error) { console.error('address PUT error:', error); return NextResponse.json({ error: 'Failed to update address' }, { status: 500 }) }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.address.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) { console.error('address DELETE error:', error); return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 }) }
}
