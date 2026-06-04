import ExcelJS from 'exceljs'

// ─── Color Palette ────────────────────────────────────────
const GOLD        = 'D4AF37'
const DARK_BG     = '2C3E50'
const HEADER_BG   = '2C3E50'
const GREEN_MED   = 'C8E6C9'
const RED_LIGHT   = 'FFEBEE'
const WHITE       = 'FFFFFF'
const BORDER_CLR  = 'B0BEC5'

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
  orders: { status: string; total: number }[]
  expenses: ExpenseRow[]
  totalRevenue: number
  totalExpenses: number
  netRevenue: number
}): Promise<Buffer> {
  const { expenses, totalRevenue, totalExpenses, netRevenue } = opts

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Saraya Al-Arab'
  wb.created = new Date()

  const ws = wb.addWorksheet('تقرير الشيفت', {
    views: [{ rightToLeft: true }],
    properties: { tabColor: { argb: GOLD } },
  })

  // Column widths: A=# B=اسم C=فئة D=مبلغ | gap | E=بيان F=قيمة
  ws.columns = [
    { width: 5 },   // A - #
    { width: 22 },  // B - اسم المصروف
    { width: 14 },  // C - الفئة
    { width: 14 },  // D - المبلغ
    { width: 4 },   // E - فراغ فاصل
    { width: 22 },  // F - البيان
    { width: 16 },  // G - القيمة
  ]

  // ─── عنوان الصفحة ────────────────────────────────
  ws.mergeCells('A1:G1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'تقرير شيفت سرايا العرب'
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: WHITE } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 40

  // ─── فاصل ذهبي ───────────────────────────────────
  ws.mergeCells('A2:G2')
  ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } }
  ws.getRow(2).height = 4

  // ─── Headers: تفاصيل المصروفات (A-D) | ملخص الإيرادات (F-G) ──
  const headerRow = 3

  // header تفاصيل المصروفات
  ;['#', 'اسم المصروف', 'الفئة', 'المبلغ'].forEach((h, i) => {
    const col = ['A', 'B', 'C', 'D'][i]
    const c = ws.getCell(`${col}${headerRow}`)
    c.value = h
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
  })

  // header ملخص الإيرادات
  ;['البيان', 'القيمة'].forEach((h, i) => {
    const col = ['F', 'G'][i]
    const c = ws.getCell(`${col}${headerRow}`)
    c.value = h
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
  })
  ws.getRow(headerRow).height = 28

  // ─── بيانات المصروفات (عمود A-D) ────────────────
  let expRow = headerRow + 1
  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i]
    const bg = i % 2 === 0 ? RED_LIGHT : WHITE
    const vals: (string | number)[] = [i + 1, e.title, e.category, parseFloat(e.amount.toFixed(2))]
    ;['A', 'B', 'C', 'D'].forEach((col, ci) => {
      const c = ws.getCell(`${col}${expRow}`)
      c.value = vals[ci]
      if (col === 'D') {
        c.numFmt = '#,##0.00" ج.م"'
        c.font = { name: 'Arial', size: 10, bold: true }
      } else {
        c.font = { name: 'Arial', size: 10 }
      }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
      c.border = thinBorder()
    })
    ws.getRow(expRow).height = 22
    expRow++
  }

  // صف إجمالي المصروفات
  ;['A', 'B', 'C', 'D'].forEach((col) => {
    const c = ws.getCell(`${col}${expRow}`)
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
  })
  ws.getCell(`B${expRow}`).value = ''
  ws.getCell(`C${expRow}`).value = 'الإجمالي'
  const expTotalCell = ws.getCell(`D${expRow}`)
  expTotalCell.value = totalExpenses
  expTotalCell.numFmt = '#,##0.00" ج.م"'
  ws.getRow(expRow).height = 26

  // ─── بيانات ملخص الإيرادات (عمود F-G) ───────────
  const summaryData = [
    { label: 'إجمالي الإيرادات', value: totalRevenue,  bg: 'FFF8E1' },
    { label: 'إجمالي المصروفات', value: totalExpenses, bg: RED_LIGHT },
    { label: 'صافي الإيرادات',   value: netRevenue,    bg: GREEN_MED },
  ]

  summaryData.forEach(({ label, value, bg }, i) => {
    const r = headerRow + 1 + i
    const fCell = ws.getCell(`F${r}`)
    fCell.value = label
    fCell.font = { name: 'Arial', size: 11, bold: true }
    fCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    fCell.alignment = { horizontal: 'right', vertical: 'middle' }
    fCell.border = thinBorder()

    const gCell = ws.getCell(`G${r}`)
    gCell.value = value
    gCell.numFmt = '#,##0.00" ج.م"'
    gCell.font = { name: 'Arial', size: 11, bold: i === 2 }
    gCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    gCell.alignment = { horizontal: 'center', vertical: 'middle' }
    gCell.border = thinBorder()

    ws.getRow(r).height = 24
  })

  // ─── صافي الإيرادات الكبير (F-G) ─────────────────
  const netRow = headerRow + 5
  ws.mergeCells(`F${netRow}:G${netRow}`)
  const netCell = ws.getCell(`F${netRow}`)
  netCell.value = `صافي الإيرادات:  ${netRevenue.toFixed(2)} ج.م`
  netCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: netRevenue >= 0 ? '1B5E20' : 'B71C1C' } }
  netCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: netRevenue >= 0 ? GREEN_MED : RED_LIGHT } }
  netCell.alignment = { horizontal: 'center', vertical: 'middle' }
  netCell.border = {
    top:    { style: 'medium', color: { argb: GOLD } },
    bottom: { style: 'medium', color: { argb: GOLD } },
    left:   { style: 'medium', color: { argb: GOLD } },
    right:  { style: 'medium', color: { argb: GOLD } },
  }
  ws.getRow(netRow).height = 36

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── Helpers ──────────────────────────────────────────────
function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top:    { style: 'thin', color: { argb: BORDER_CLR } },
    bottom: { style: 'thin', color: { argb: BORDER_CLR } },
    left:   { style: 'thin', color: { argb: BORDER_CLR } },
    right:  { style: 'thin', color: { argb: BORDER_CLR } },
  }
}

const ORDER_TYPE_AR: Record<string, string> = {
  DINE_IN: 'داخلي',
  TAKEAWAY: 'سفري',
  DELIVERY: 'دليفري',
}

const ORDER_STATUS_AR: Record<string, string> = {
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
}

export { ORDER_TYPE_AR, ORDER_STATUS_AR }