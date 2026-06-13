import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const d = new Date(dateStr + 'T00:00:00')
    const next = new Date(d)
    next.setDate(next.getDate() + 1)

    const employees = await db.employee.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    const logs = await db.dailyLog.findMany({
      where: { date: { gte: d, lt: next } },
      orderBy: { employee: { name: 'asc' } },
    })

    const logMap = new Map<string, typeof logs[0]>()
    logs.forEach(l => logMap.set(l.employeeId, l))

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Saraya - Top App'
    wb.created = new Date()

    const ws = wb.addWorksheet(`حضور ${dateStr}`)

    ws.views = [{ rightToLeft: true }]

    // Title
    ws.mergeCells('A1:G1')
    const titleCell = ws.getCell('A1')
    titleCell.value = `سجل الحضور والانصراف - ${new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFD4AF37' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 40

    // Header row
    const headerRow = ws.getRow(3)
    const headers = ['م', 'الموظف', 'الوظيفة', 'التخصص', 'حضور', 'انصراف', 'إجمالي الساعات', 'أوفر تايم', 'الحالة']
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = h
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      }
    })
    headerRow.height = 30

    // Data rows
    let idx = 1
    for (const emp of employees) {
      const log = logMap.get(emp.id)
      const row = ws.getRow(3 + idx)
      const clockIn = log?.clockIn ? new Date(log.clockIn) : null
      const clockOut = log?.clockOut ? new Date(log.clockOut) : null
      const workedHrs = clockIn && clockOut ? ((clockOut.getTime() - clockIn.getTime()) / 3600000) : 0

      const values = [
        idx,
        emp.name,
        emp.jobTitle || '—',
        emp.specialization || '—',
        clockIn ? clockIn.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—',
        clockOut ? clockOut.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—',
        workedHrs > 0 ? workedHrs.toFixed(1) : '—',
        log && log.overtimeMinutes > 0 ? `${Math.floor(log.overtimeMinutes / 60)}h ${log.overtimeMinutes % 60}m` : '—',
        !log ? 'لم يسجل' : log.status === 'ABSENT' ? 'غائب' : clockOut ? 'مكتمل' : clockIn ? 'لم ينصرف' : 'لم يسجل',
      ]

      values.forEach((v, i) => {
        const cell = row.getCell(i + 1)
        cell.value = v
        cell.font = { name: 'Arial', size: 10 }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        }
      })

      // Color the status cell
      const statusCell = row.getCell(9)
      if (!log) {
        statusCell.font = { name: 'Arial', size: 10, color: { argb: 'FF9CA3AF' } }
      } else if (log.status === 'ABSENT') {
        statusCell.font = { name: 'Arial', size: 10, color: { argb: 'FFEF4444' }, bold: true }
      } else if (log.clockIn && log.clockOut) {
        statusCell.font = { name: 'Arial', size: 10, color: { argb: 'FF22C55E' }, bold: true }
      } else if (log.clockIn && !log.clockOut) {
        statusCell.font = { name: 'Arial', size: 10, color: { argb: 'FFF59E0B' }, bold: true }
      }

      // Color overtime cell
      if (log && log.overtimeMinutes > 0) {
        const otCell = row.getCell(8)
        otCell.font = { name: 'Arial', size: 10, color: { argb: 'FFF59E0B' }, bold: true }
      }

      idx++
    }

    // Column widths
    ws.getColumn(1).width = 5
    ws.getColumn(2).width = 25
    ws.getColumn(3).width = 15
    ws.getColumn(4).width = 15
    ws.getColumn(5).width = 12
    ws.getColumn(6).width = 12
    ws.getColumn(7).width = 14
    ws.getColumn(8).width = 14
    ws.getColumn(9).width = 12

    // Summary row
    const totalRow = ws.getRow(3 + idx + 1)
    totalRow.getCell(1).value = ''
    totalRow.getCell(2).value = 'الملخص'
    totalRow.getCell(2).font = { name: 'Arial', size: 11, bold: true }
    const presentCount = logs.filter(l => l.clockIn).length
    const absentCount = employees.length - presentCount
    const totalOT = logs.reduce((s, l) => s + l.overtimeMinutes, 0)
    totalRow.getCell(3).value = `الحضور: ${presentCount}`
    totalRow.getCell(4).value = `الغياب: ${absentCount}`
    totalRow.getCell(5).value = `إجمالي الأوفرتايم: ${Math.floor(totalOT / 60)}h ${totalOT % 60}m`

    const buf = await wb.xlsx.writeBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attendance_${dateStr}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
