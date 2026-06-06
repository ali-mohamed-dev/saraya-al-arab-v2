import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const DEFAULT_CATEGORIES = [
  { name: 'مشويات', icon: '🔥', sortOrder: 1 },
  { name: 'طواجن', icon: '🫕', sortOrder: 2 },
  { name: 'مقبلات', icon: '🥗', sortOrder: 3 },
  { name: 'ساندويتشات', icon: '🥙', sortOrder: 4 },
  { name: 'مشروبات', icon: '🥤', sortOrder: 5 },
  { name: 'حلويات', icon: '🍰', sortOrder: 6 },
  { name: 'أطباق رئيسية', icon: '🍽️', sortOrder: 7 },
]

// POST /api/categories/seed - Seed default categories (one-time setup)
export async function POST() {
  try {
    const results: { action: string; name: string }[] = []

    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await db.category.findUnique({ where: { name: cat.name } })
      if (!existing) {
        const created = await db.category.create({ data: cat })
        results.push({ action: 'created', name: created.name })
      } else {
        results.push({ action: 'skipped', name: existing.name })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم إضافة التصنيفات الافتراضية',
      results,
    })
  } catch (error) {
    console.error('Error seeding categories:', error)
    return NextResponse.json({ error: 'Failed to seed categories' }, { status: 500 })
  }
}
