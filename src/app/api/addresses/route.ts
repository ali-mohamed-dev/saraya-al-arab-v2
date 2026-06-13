import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const addresses = await db.address.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(addresses)
  } catch (error) { console.error('addresses GET error:', error); return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, label, address } = await request.json()
    if (!userId || !address) return NextResponse.json({ error: 'userId and address required' }, { status: 400 })
    const addr = await db.address.create({ data: { userId, label: label || 'المنزل', address } })
    return NextResponse.json(addr, { status: 201 })
  } catch (error) { console.error('addresses POST error:', error); return NextResponse.json({ error: 'Failed to create address' }, { status: 500 }) }
}
