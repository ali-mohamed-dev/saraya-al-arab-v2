import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

// PUT /api/categories/[id] - Update a category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireRole(request, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    // في Next.js 16 يجب عمل await للـ params
    const { id } = await params
    const body = await request.json()
    const { name, icon, sortOrder, isActive } = body

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'Category name cannot be empty' }, { status: 400 })
    }

    // Check for duplicate name (excluding current)
    if (name) {
      const existing = await db.category.findFirst({
        where: { name: name.trim(), NOT: { id: id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'هذا التصنيف موجود بالفعل' }, { status: 409 })
      }
    }

    const category = await db.category.update({
      where: { id: String(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE /api/categories/[id] - Delete a category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireRole(request, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id } = await params
    // Check if any meals use this category
    const category = await db.category.findUnique({ where: { id: id } })
    if (!category) {
      return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 404 })
    }

    const mealsCount = await db.meal.count({ where: { category: category.name } })
    if (mealsCount > 0) {
      return NextResponse.json(
        { error: `لا يمكن حذف التصنيف، يوجد ${mealsCount} طبق مرتبط به` },
        { status: 400 }
      )
    }

    await db.category.delete({ where: { id: id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
