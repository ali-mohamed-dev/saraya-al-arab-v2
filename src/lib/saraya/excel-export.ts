import ExcelJS from 'exceljs'

// ─── Color Palette ────────────────────────────────────────
const GOLD        = 'D4AF37'
const DARK_BG     = '1B1B2F'
const HEADER_BG   = '2C3E50'
const GREEN_LIGHT = 'E8F5E9'
const GREEN_MED   = 'C8E6C9'
const GOLD_LIGHT  = 'FFF8E1'
const RED_LIGHT   = 'FFEBEE'
const WHITE       = 'FFFFFF'
const BLACK       = '000000'
const BORDER_CLR  = 'B0BEC5'

// ─── Types ────────────────────────────────────────────────
interface OrderRow {
  orderNumber: number | string
  type: string
  status: string
  tableNumber?: string | null
  total: number
  customerName?: string | null
  createdAt: string | Date
  items?: { name: string; qty: number; price: number }[]
}

interface ExpenseRow {
  title: string
  amount: number
  category: string
  addedBy: string
  createdAt: string | Date
}

interface ShiftInfo {
  startedAt: string | Date
  endedAt?: string | Date | null
  startedBy: string
  endedBy?: string | null
  notes?: string | null
}

export async function generateShiftExcel(opts: {
  shift: ShiftInfo
  orders: OrderRow[]
  expenses: ExpenseRow[]
  totalRevenue: number
  totalExpenses: number
  netRevenue: number
}): Promise<Buffer> {
  const { shift, orders, expenses, totalRevenue, totalExpenses, netRevenue } = opts

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Saraya Al-Arab'
  wb.created = new Date()

  // ─── Sheet 1: Summary ──────────────────────────────────
  const ws = wb.addWorksheet('تقرير الشيفت', {
    views: [{ rightToLeft: true }],
    properties: { tabColor: { argb: GOLD } },
  })

  // Column widths
  ws.columns = [
    { width: 6 },   // A - #
    { width: 22 },  // B - البيان
    { width: 18 },  // C - القيمة
    { width: 18 },  // D - ملاحظات
  ]

  let row = 1

  // ─── Title ────────────────────────────────────────
  ws.mergeCells(`A${row}:D${row}`)
  const titleCell = ws.getCell(`A${row}`)
  titleCell.value = 'تقرير شيفت سرايا العرب'
  titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: WHITE } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(row).height = 45
  row++

  // ─── Gold separator ──────────────────────────────
  ws.mergeCells(`A${row}:D${row}`)
  const sepCell = ws.getCell(`A${row}`)
  sepCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } }
  ws.getRow(row).height = 5
  row++

  // ─── Shift Info Section ───────────────────────────
  row = addSectionHeader(ws, row, 'بيانات الشيفت')

  const shiftData = [
    ['تاريخ البداية', formatDate(shift.startedAt), ''],
    ['تاريخ النهاية', shift.endedAt ? formatDate(shift.endedAt) : '---', ''],
    ['بدأ بواسطة', shift.startedBy, ''],
    ['أُنهي بواسطة', shift.endedBy || '---', ''],
    ['ملاحظات', shift.notes || '---', ''],
  ]

  for (const [label, value, note] of shiftData) {
    row = addInfoRow(ws, row, label, value, note, GREEN_LIGHT)
  }

  row++ // spacer

  // ─── Revenue Summary ──────────────────────────────
  row = addSectionHeader(ws, row, 'ملخص الإيرادات')

  const revData = [
    ['إجمالي الإيرادات', totalRevenue.toFixed(2) + ' ج.م', '', GOLD_LIGHT],
    ['إجمالي المصروفات', totalExpenses.toFixed(2) + ' ج.م', '', RED_LIGHT],
    ['صافي الإيرادات', netRevenue.toFixed(2) + ' ج.م', '', GREEN_MED],
  ] as const

  for (const [label, value, note, bg] of revData) {
    row = addInfoRow(ws, row, label, value, note, bg)
  }

  row++ // spacer

  // ─── Orders Table ─────────────────────────────────
  row = addSectionHeader(ws, row, 'تفاصيل الطلبات')

  // Table headers
  const orderHeaders = ['#', 'نوع الطلب', 'الحالة', 'المبلغ']
  const hdrRow = ws.getRow(row)
  orderHeaders.forEach((h, i) => {
    const c = hdrRow.getCell(i + 1)
    c.value = h
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
  })
  ws.getRow(row).height = 28
  row++

  // Table data
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED')
  for (let i = 0; i < deliveredOrders.length; i++) {
    const o = deliveredOrders[i]
    const dataRow = ws.getRow(row)
    const bg = i % 2 === 0 ? GREEN_LIGHT : WHITE

    const vals = [
      i + 1,
      ORDER_TYPE_AR[o.type] || o.type,
      ORDER_STATUS_AR[o.status] || o.status,
      o.total.toFixed(2) + ' ج.م',
    ]
    vals.forEach((v, ci) => {
      const c = dataRow.getCell(ci + 1)
      c.value = v
      c.font = { name: 'Arial', size: 10 }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
      c.border = thinBorder()
    })
    ws.getRow(row).height = 22
    row++
  }

  // Total row for orders
  const orderTotalRow = ws.getRow(row)
  orderTotalRow.getCell(1).value = ''
  orderTotalRow.getCell(2).value = ''
  orderTotalRow.getCell(3).value = 'الإجمالي'
  orderTotalRow.getCell(4).value = totalRevenue.toFixed(2) + ' ج.م'
  for (let ci = 1; ci <= 4; ci++) {
    const c = orderTotalRow.getCell(ci)
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
  }
  ws.getRow(row).height = 28
  row++

  row++ // spacer

  // ─── Expenses Table ───────────────────────────────
  row = addSectionHeader(ws, row, 'تفاصيل المصروفات')

  const expHeaders = ['#', 'اسم المصروف', 'الفئة', 'المبلغ']
  const expHdrRow = ws.getRow(row)
  expHeaders.forEach((h, i) => {
    const c = expHdrRow.getCell(i + 1)
    c.value = h
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
  })
  ws.getRow(row).height = 28
  row++

  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i]
    const dataRow = ws.getRow(row)
    const bg = i % 2 === 0 ? RED_LIGHT : WHITE

    const vals = [i + 1, e.title, e.category, e.amount.toFixed(2) + ' ج.م']
    vals.forEach((v, ci) => {
      const c = dataRow.getCell(ci + 1)
      c.value = v
      c.font = { name: 'Arial', size: 10 }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
      c.border = thinBorder()
    })
    ws.getRow(row).height = 22
    row++
  }

  // Total row for expenses
  const expTotalRow = ws.getRow(row)
  expTotalRow.getCell(1).value = ''
  expTotalRow.getCell(2).value = ''
  expTotalRow.getCell(3).value = 'الإجمالي'
  expTotalRow.getCell(4).value = totalExpenses.toFixed(2) + ' ج.م'
  for (let ci = 1; ci <= 4; ci++) {
    const c = expTotalRow.getCell(ci)
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
  }
  ws.getRow(row).height = 28
  row++

  row++ // spacer

  // ─── Net Revenue Highlight ────────────────────────
  ws.mergeCells(`A${row}:D${row}`)
  const netCell = ws.getCell(`A${row}`)
  netCell.value = `صافي الإيرادات:  ${netRevenue.toFixed(2)} ج.م`
  netCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: netRevenue >= 0 ? '1B5E20' : 'B71C1C' } }
  netCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: netRevenue >= 0 ? GREEN_MED : RED_LIGHT } }
  netCell.alignment = { horizontal: 'center', vertical: 'middle' }
  netCell.border = {
    top: { style: 'medium', color: { argb: GOLD } },
    bottom: { style: 'medium', color: { argb: GOLD } },
    left: { style: 'medium', color: { argb: GOLD } },
    right: { style: 'medium', color: { argb: GOLD } },
  }
  ws.getRow(row).height = 40

  // ─── Generate buffer ──────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── Helpers ──────────────────────────────────────────────

function addSectionHeader(ws: ExcelJS.Worksheet, row: number, title: string): number {
  ws.mergeCells(`A${row}:D${row}`)
  const cell = ws.getCell(`A${row}`)
  cell.value = title
  cell.font = { name: 'Arial', size: 13, bold: true, color: { argb: WHITE } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  cell.border = {
    top: { style: 'medium', color: { argb: GOLD } },
    bottom: { style: 'thin', color: { argb: GOLD } },
    left: { style: 'thin', color: { argb: GOLD } },
    right: { style: 'thin', color: { argb: GOLD } },
  }
  ws.getRow(row).height = 30
  return row + 1
}

function addInfoRow(
  ws: ExcelJS.Worksheet,
  row: number,
  label: string,
  value: string,
  note: string,
  bgColor: string,
): number {
  ws.mergeCells(`A${row}:B${row}`)
  const labelCell = ws.getCell(`A${row}`)
  labelCell.value = label
  labelCell.font = { name: 'Arial', size: 11, bold: true }
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
  labelCell.alignment = { horizontal: 'right', vertical: 'middle' }
  labelCell.border = thinBorder()

  ws.mergeCells(`C${row}:D${row}`)
  const valueCell = ws.getCell(`C${row}`)
  valueCell.value = value
  valueCell.font = { name: 'Arial', size: 11 }
  valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
  valueCell.alignment = { horizontal: 'center', vertical: 'middle' }
  valueCell.border = thinBorder()

  ws.getRow(row).height = 24
  return row + 1
}

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb: BORDER_CLR } },
    bottom: { style: 'thin', color: { argb: BORDER_CLR } },
    left: { style: 'thin', color: { argb: BORDER_CLR } },
    right: { style: 'thin', color: { argb: BORDER_CLR } },
  }
}

function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ORDER_TYPE_AR: Record<string, string> = {
  DINE_IN: 'تيك أوت',
  TAKEAWAY: 'سفري',
  DELIVERY: 'دليفري',
}

const ORDER_STATUS_AR: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'مؤكد',
  PREPARING: 'يُحضر',
  READY: 'جاهز',
  READY_TO_PAY: 'جاهز للدفع',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
}
