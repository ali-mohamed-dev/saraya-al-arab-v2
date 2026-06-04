import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/settings - Get store settings
export async function GET() {
  try {
    let settings = await db.storeSettings.findUnique({ where: { id: 'default' } })

    if (!settings) {
      settings = await db.storeSettings.create({
        data: { id: 'default', takingOrders: true },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT /api/settings - Update store settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.takingOrders !== undefined) updateData.takingOrders = body.takingOrders
    if (body.message      !== undefined) updateData.message      = body.message

    const settings = await db.storeSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id:           'default',
        takingOrders: body.takingOrders !== undefined ? body.takingOrders : true,
        message:      body.message || 'المطعم مغلق حالياً، لا يمكن استقبال الطلبات',
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
