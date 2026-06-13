import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

async function getSettings() {
  let settings = await db.storeSettings.findUnique({ where: { id: 'default' } })
  if (!settings) {
    settings = await db.storeSettings.create({
      data: { id: 'default', takingOrders: true, areas: ['صالة رئيسية'] },
    })
  }
  if (!settings.areas || settings.areas.length === 0) {
    settings = await db.storeSettings.update({
      where: { id: 'default' },
      data: { areas: ['صالة رئيسية'] },
    })
  }
  return settings
}

export async function GET() {
  try {
    const settings = await getSettings()
    // Also include any areas from existing tables that aren't yet in settings
    const tableAreas = await db.restaurantTable.findMany({
      where: { area: { not: '' } },
      select: { area: true },
      distinct: ['area'],
    })
    const tableAreaNames = tableAreas.map(t => t.area).filter(Boolean) as string[]
    const merged = Array.from(new Set([...settings.areas, ...tableAreaNames]))
    // Persist merged areas back so UI stays in sync
    if (merged.length !== settings.areas.length) {
      await db.storeSettings.update({
        where: { id: 'default' },
        data: { areas: merged },
      })
    }
    return NextResponse.json(merged)
  } catch (error) {
    console.error('Error fetching areas:', error)
    return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const text = await request.text()
    let body
    try { body = JSON.parse(text) } catch {
      return NextResponse.json({ error: 'Invalid JSON body: ' + text }, { status: 400 })
    }
    const { name } = body
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Area name required' }, { status: 400 })
    }

    const settings = await getSettings()
    const areas = settings.areas || []

    if (areas.includes(name.trim())) {
      return NextResponse.json({ error: 'المنطقة موجودة بالفعل' }, { status: 400 })
    }

    await db.$executeRaw`UPDATE "StoreSettings" SET areas = array_append(areas, ${name.trim()}) WHERE id = 'default'`

    const updated = await getSettings()
    return NextResponse.json(updated.areas)
  } catch (error) {
    console.error('Error adding area:', error)
    return NextResponse.json({ error: 'Failed to add area' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const text = await request.text()
    let body
    try { body = JSON.parse(text) } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const { name } = body
    if (!name) {
      return NextResponse.json({ error: 'Area name required' }, { status: 400 })
    }

    await db.$executeRaw`UPDATE "StoreSettings" SET areas = array_remove(areas, ${name}) WHERE id = 'default'`

    const updated = await getSettings()
    return NextResponse.json(updated.areas)
  } catch (error) {
    console.error('Error deleting area:', error)
    return NextResponse.json({ error: 'Failed to delete area' }, { status: 500 })
  }
}
