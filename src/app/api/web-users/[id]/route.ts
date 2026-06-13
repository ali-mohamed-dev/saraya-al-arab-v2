import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await db.webUser.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, picture: user.picture, totalSpent: user.totalSpent, pointsBalance: user.pointsBalance, isBlocked: user.isBlocked })
  } catch (error) { console.error('web-user GET error:', error); return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 }) }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const data: any = {}
    if (body.isBlocked !== undefined) data.isBlocked = body.isBlocked
    if (body.phone !== undefined) data.phone = body.phone
    if (body.name !== undefined) data.name = body.name
    // Admin cannot directly edit totalSpent or pointsBalance — they are managed by the order/loyalty system
    const user = await db.webUser.update({ where: { id }, data })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, picture: user.picture, totalSpent: user.totalSpent, pointsBalance: user.pointsBalance, isBlocked: user.isBlocked })
  } catch (error) { console.error('web-user PUT error:', error); return NextResponse.json({ error: 'Failed to update user' }, { status: 500 }) }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await db.webUser.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    await db.webUser.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('web-user DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
