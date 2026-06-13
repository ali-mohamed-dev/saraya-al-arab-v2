import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    let settings = await db.storeSettings.findUnique({ where: { id: 'default' } })
    if (!settings) {
      settings = await db.storeSettings.create({ data: { id: 'default' } })
    }
    return NextResponse.json({
      loyaltyEnabled: settings.loyaltyEnabled,
      loyaltyThreshold: settings.loyaltyThreshold,
      loyaltyCashback: settings.loyaltyCashback,
    })
  } catch (error) { console.error('loyalty GET error:', error); return NextResponse.json({ error: 'Failed to fetch loyalty settings' }, { status: 500 }) }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { loyaltyEnabled, loyaltyThreshold, loyaltyCashback } = body

    // FIX: Validate that numeric fields are actual positive numbers, not silently convert invalid input to 0
    const parsedThreshold = parseFloat(loyaltyThreshold)
    const parsedCashback = parseFloat(loyaltyCashback)

    if (loyaltyThreshold !== undefined && (isNaN(parsedThreshold) || parsedThreshold < 0)) {
      return NextResponse.json(
        { error: 'قيمة حد النقاط يجب أن تكون رقم موجب' },
        { status: 400 }
      )
    }
    if (loyaltyCashback !== undefined && (isNaN(parsedCashback) || parsedCashback < 0)) {
      return NextResponse.json(
        { error: 'قيمة استرداد النقاط يجب أن تكون رقم موجب' },
        { status: 400 }
      )
    }

    const thresholdValue = loyaltyThreshold !== undefined ? parsedThreshold : 0
    const cashbackValue = loyaltyCashback !== undefined ? parsedCashback : 0

    const settings = await db.storeSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', loyaltyEnabled: !!loyaltyEnabled, loyaltyThreshold: thresholdValue, loyaltyCashback: cashbackValue },
      update: { loyaltyEnabled: !!loyaltyEnabled, loyaltyThreshold: thresholdValue, loyaltyCashback: cashbackValue },
    })
    return NextResponse.json({
      loyaltyEnabled: settings.loyaltyEnabled,
      loyaltyThreshold: settings.loyaltyThreshold,
      loyaltyCashback: settings.loyaltyCashback,
    })
  } catch (error) { console.error('loyalty PUT error:', error); return NextResponse.json({ error: 'Failed to update loyalty settings' }, { status: 500 }) }
}
