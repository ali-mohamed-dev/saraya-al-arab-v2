import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { expenses: true, attendances: true } },
      },
    })
    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, jobTitle, specialization, salary, dailyHours } = body
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Employee name is required' }, { status: 400 })
    }
    const emp = await db.employee.create({
      data: { name: name.trim(), jobTitle: jobTitle || '', specialization: specialization || '', salary: salary || 0, dailyHours: dailyHours || 8 },
    })
    return NextResponse.json(emp, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
