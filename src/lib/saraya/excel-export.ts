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

interface OrderItemRow {
  name: string
  qty: number
  price: number
}

interface OrderRow {
  orderNumber: number
  type: string
  status: string
  tableNumber?: string | null
  total: number
  customerName?: string | null
  createdAt: string | Date
  items?: OrderItemRow[]
  payments?: { method: string; amount: number }[]
  discountType?: string
  discountValue?: number
  discountAmount?: number
  discountReason?: string
  cancelledBy?: string | null
  cancelReason?: string | null
}

interface ShiftInfo {
  startedAt: string | Date
  endedAt?: string | Date | null
  startedBy: string
  endedBy?: string | null
  notes?: string | null
}

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
  TABLE: 'طاولة',
}

const ORDER_STATUS_AR: Record<string, string> = {
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
}

export { ORDER_TYPE_AR, ORDER_STATUS_AR }

function fmtDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleString('ar-EG', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function writeSectionHeader(ws: ExcelJS.Worksheet, row: number, text: string, columns: string[], color: string): number {
  ws.mergeCells(`${columns[0]}${row}:${columns[columns.length - 1]}${row}`)
  const cell = ws.getCell(`${columns[0]}${row}`)
  cell.value = text
  cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: WHITE } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(row).height = 30
  return row + 1
}

function writeTableHeader(ws: ExcelJS.Worksheet, row: number, headers: string[], cols: string[]): number {
  headers.forEach((h, i) => {
    const c = ws.getCell(`${cols[i]}${row}`)
    c.value = h
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
  })
  ws.getRow(row).height = 26
  return row + 1
}

function writeDataRow(ws: ExcelJS.Worksheet, row: number, values: (string | number)[], cols: string[], amountCol?: string): number {
  const bg = row % 2 === 0 ? 'F5F5F5' : WHITE
  values.forEach((v, i) => {
    const c = ws.getCell(`${cols[i]}${row}`)
    c.value = v
    c.font = { name: 'Arial', size: 10 }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
    if (amountCol && cols[i] === amountCol) {
      c.numFmt = '#,##0.00" ج.م"'
      c.font = { name: 'Arial', size: 10, bold: true }
    }
  })
  ws.getRow(row).height = 22
  return row + 1
}

function writeSummaryPair(ws: ExcelJS.Worksheet, row: number, label: string, value: number, bg: string): number {
  ws.mergeCells(`A${row}:E${row}`)
  const lc = ws.getCell(`A${row}`)
  lc.value = label
  lc.font = { name: 'Arial', size: 11, bold: true }
  lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  lc.alignment = { horizontal: 'right', vertical: 'middle' }
  lc.border = thinBorder()

  const vc = ws.getCell(`F${row}`)
  vc.value = value
  vc.numFmt = '#,##0.00" ج.م"'
  vc.font = { name: 'Arial', size: 11, bold: true }
  vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  vc.alignment = { horizontal: 'center', vertical: 'middle' }
  vc.border = thinBorder()

  ws.getRow(row).height = 24
  return row + 1
}

export async function generateShiftExcel(opts: {
  shift: ShiftInfo
  orders: OrderRow[]
  cancelledOrders: OrderRow[]
  discountedOrders: OrderRow[]
  expenses: ExpenseRow[]
  totalRevenue: number
  totalExpenses: number
  netRevenue: number
  totalDiscounts: number
  cashRevenue: number
  visaRevenue: number
  vodafoneCashRevenue: number
}): Promise<Buffer> {
  const { shift, orders, cancelledOrders, discountedOrders, expenses, totalRevenue, totalExpenses, netRevenue, totalDiscounts, cashRevenue, visaRevenue, vodafoneCashRevenue } = opts

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Top'
  wb.created = new Date()

  const ws = wb.addWorksheet('تقرير الشيفت', {
    views: [{ rightToLeft: true }],
    properties: { tabColor: { argb: GOLD } },
  })

  ws.columns = [
    { width: 5 },   // A - #
    { width: 24 },  // B - الاسم / البيان
    { width: 16 },  // C - النوع / الفئة
    { width: 16 },  // D - التفاصيل
    { width: 16 },  // E - القيمة
    { width: 16 },  // F - القيمة 2
    { width: 16 },  // G - القيمة 3
  ]

  let r = 1

  // ══════════════════════════════════════════════
  // TITLE
  // ══════════════════════════════════════════════
  ws.mergeCells('A1:G1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'تقرير شيفت - توب'
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: WHITE } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 40
  r = 2

  // Gold separator
  ws.mergeCells(`A${r}:G${r}`)
  ws.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } }
  ws.getRow(r).height = 4
  r++

  // ══════════════════════════════════════════════
  // SHIFT INFO
  // ══════════════════════════════════════════════
  const infoColor = '5DADE2'
  ws.mergeCells(`A${r}:G${r}`)
  ws.getCell(`A${r}`).value = 'بيانات الوردية'
  ws.getCell(`A${r}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
  ws.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: infoColor } }
  ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 24
  r++

  const infoRows = [
    ['بداية الوردية', fmtDate(shift.startedAt)],
    ['نهاية الوردية', shift.endedAt ? fmtDate(shift.endedAt) : '—'],
    ['بدأ بواسطة', shift.startedBy || '—'],
    ['أنهى بواسطة', shift.endedBy || '—'],
  ]
  if (shift.notes) infoRows.push(['ملاحظات', shift.notes])

  infoRows.forEach(([label, value]) => {
    ws.getCell(`A${r}`).value = label
    ws.getCell(`A${r}`).font = { name: 'Arial', size: 10, bold: true }
    ws.getCell(`A${r}`).alignment = { horizontal: 'right', vertical: 'middle' }
    ws.getCell(`A${r}`).border = thinBorder()

    ws.mergeCells(`B${r}:G${r}`)
    ws.getCell(`B${r}`).value = value
    ws.getCell(`B${r}`).font = { name: 'Arial', size: 10 }
    ws.getCell(`B${r}`).alignment = { horizontal: 'right', vertical: 'middle' }
    ws.getCell(`B${r}`).border = thinBorder()
    ws.getRow(r).height = 22
    r++
  })

  r++ // spacer

  // ══════════════════════════════════════════════
  // REVENUE SUMMARY (full width, A-F used)
  // ══════════════════════════════════════════════
  r = writeSectionHeader(ws, r, 'ملخص الإيرادات', ['A','B','C','D','E','F','G'], '27AE60')

  const paymentColor = 'FFF8E1'
  r = writeSummaryPair(ws, r, 'إجمالي الإيرادات', totalRevenue, paymentColor)
  r = writeSummaryPair(ws, r, 'مدفوع كاش', cashRevenue, 'E8F5E9')
  r = writeSummaryPair(ws, r, 'مدفوع فيزا', visaRevenue, 'E3F2FD')
  r = writeSummaryPair(ws, r, 'مدفوع فودافون كاش', vodafoneCashRevenue, 'F3E5F5')
  r = writeSummaryPair(ws, r, 'إجمالي المصروفات', totalExpenses, RED_LIGHT)
  r = writeSummaryPair(ws, r, 'الخصومات', totalDiscounts, 'FFF3E0')

  // Net revenue - golden box full width
  ws.mergeCells(`A${r}:G${r}`)
  const netCell = ws.getCell(`A${r}`)
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
  ws.getRow(r).height = 36
  r++
  r++ // spacer

  // ══════════════════════════════════════════════
  // EXPENSES (columns A-D)
  // ══════════════════════════════════════════════
  if (expenses.length > 0) {
    r = writeSectionHeader(ws, r, 'المصروفات', ['A','B','C','D'], 'C0392B')
    r = writeTableHeader(ws, r, ['#', 'اسم المصروف', 'الفئة', 'المبلغ'], ['A','B','C','D'])

    expenses.forEach((e, i) => {
      r = writeDataRow(ws, r, [i + 1, e.title, e.category, parseFloat(e.amount.toFixed(2))], ['A','B','C','D'], 'D')
    })

    // Total row
    ;['A','B','C','D'].forEach(col => {
      const c = ws.getCell(`${col}${r}`)
      c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
      c.border = thinBorder()
    })
    ws.getCell(`B${r}`).value = ''
    ws.getCell(`C${r}`).value = 'الإجمالي'
    ws.getCell(`D${r}`).value = totalExpenses
    ws.getCell(`D${r}`).numFmt = '#,##0.00" ج.م"'
    ws.getRow(r).height = 26
    r++
    r++ // spacer
  }

  // ══════════════════════════════════════════════
  // DISCOUNTS (manual only)
  // ══════════════════════════════════════════════
  if (discountedOrders.length > 0) {
    r = writeSectionHeader(ws, r, 'الخصومات (يدوي)', ['A','B','C','D','E','F','G'], 'E67E22')
    r = writeTableHeader(ws, r, ['#', 'فاتورة', 'العميل', 'القيمة', 'النوع', 'السبب', 'بواسطة'], ['A','B','C','D','E','F','G'])

    discountedOrders.forEach((d, i) => {
      const vals: (string | number)[] = [
        i + 1,
        `#${d.orderNumber}`,
        d.customerName || '-',
        d.discountAmount || 0,
        d.discountType === 'PERCENTAGE' ? `${d.discountValue}%` : 'مبلغ ثابت',
        d.discountReason || '-',
        d.cancelledBy || '-',
      ]
      r = writeDataRow(ws, r, vals, ['A','B','C','D','E','F','G'], 'D')
    })

    // Total
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'إجمالي الخصومات'
    ws.getCell(`A${r}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    ws.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E67E22' } }
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${r}`).border = thinBorder()
    for (let ci = 1; ci <= 7; ci++) {
      const col = 'ABCDEFG'[ci - 1]
      const cell = ws.getCell(`${col}${r}`)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E67E22' } }
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
      cell.border = thinBorder()
    }
    ws.getCell(`G${r}`).value = totalDiscounts
    ws.getCell(`G${r}`).numFmt = '#,##0.00" ج.م"'
    ws.getCell(`G${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(r).height = 26
    r++
    r++ // spacer
  }

  // ══════════════════════════════════════════════
  // CANCELLED ORDERS
  // ══════════════════════════════════════════════
  if (cancelledOrders.length > 0) {
    r = writeSectionHeader(ws, r, 'الطلبات الملغية', ['A','B','C','D','E','F','G'], 'E74C3C')
    r = writeTableHeader(ws, r, ['#', 'فاتورة', 'العميل', 'النوع', 'المبلغ', 'ملغي بواسطة', 'سبب الإلغاء'], ['A','B','C','D','E','F','G'])

    cancelledOrders.forEach((o, i) => {
      const vals: (string | number)[] = [
        i + 1,
        `#${o.orderNumber}`,
        o.customerName || '-',
        ORDER_TYPE_AR[o.type] || o.type,
        o.total || 0,
        o.cancelledBy || '-',
        o.cancelReason || '—',
      ]
      r = writeDataRow(ws, r, vals, ['A','B','C','D','E','F','G'], 'E')
    })
    r++
    r++ // spacer
  }

  // ══════════════════════════════════════════════
  // ORDERS (delivered only)
  // ══════════════════════════════════════════════
  if (orders.length > 0) {
    r = writeSectionHeader(ws, r, 'الطلبات', ['A','B','C','D','E','F','G'], '2980B9')
    r = writeTableHeader(ws, r, ['#', 'فاتورة', 'العميل', 'النوع', 'الإجمالي', 'طريقة الدفع', 'الأصناف'], ['A','B','C','D','E','F','G'])

    orders.forEach((o, i) => {
      const paymentsStr = o.payments && o.payments.length > 0
        ? o.payments.map((p: any) => {
            const label = p.method === 'CASH' ? 'كاش' : p.method === 'VISA' ? 'فيزا' : p.method === 'VODAFONE_CASH' ? 'فودافون كاش' : p.method
            return `${label}: ${p.amount.toFixed(2)}`
          }).join(', ')
        : 'كاش'

      const itemsStr = o.items && o.items.length > 0
        ? o.items.map((it: any) => `${it.name} x${it.qty}`).join(', ')
        : '—'

      const vals: (string | number)[] = [
        i + 1,
        `#${o.orderNumber}`,
        o.customerName || '-',
        ORDER_TYPE_AR[o.type] || o.type,
        o.total || 0,
        paymentsStr,
        itemsStr,
      ]
      // Use A-G but F and G may have long text
      r = writeDataRow(ws, r, vals, ['A','B','C','D','E','F','G'], 'E')
      // Make item text wrap and row taller if needed
      const gCell = ws.getCell(`G${r - 1}`)
      if (itemsStr.length > 40) {
        gCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }
        ws.getRow(r - 1).height = Math.max(22, Math.ceil(itemsStr.length / 50) * 20)
      }
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── Monthly Report Excel ────────────────────────────────

export async function generateMonthlyReportExcel(opts: {
  title?: string
  fromDate: string
  toDate: string
  revenues: { shiftId: string; startedAt: Date; totalRevenue: number }[]
  expenses: ExpenseRow[]
  categoryTotals: { category: string; total: number }[]
  totalRevenue: number
  totalExpenses: number
  netRevenue: number
  discountedOrders: Array<{
    id: string
    orderNumber: number
    discountType: string
    discountValue: number
    discountAmount: number
    discountReason: string
    discountAppliedBy: string
    customerName: string
    createdAt: Date
  }>
  totalDiscounts: number
  totalLoyaltyDiscounts?: number
}): Promise<Buffer> {
  const { title, fromDate, toDate, revenues, expenses, categoryTotals, totalRevenue, totalExpenses, netRevenue, discountedOrders, totalDiscounts, totalLoyaltyDiscounts = 0 } = opts

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Top'
  wb.created = new Date()

  const ws = wb.addWorksheet('التقرير', {
    views: [{ rightToLeft: true }],
    properties: { tabColor: { argb: GOLD } },
  })

  ws.columns = [
    { width: 5 },   // A - #
    { width: 28 },  // B - الاسم / البيان
    { width: 18 },  // C - الفئة / التفاصيل
    { width: 16 },  // D - المبلغ
    { width: 16 },  // E - النوع
    { width: 22 },  // F - سبب الخصم
    { width: 16 },  // G - بواسطة
  ]

  // ─── Track current row ────────────────────────
  let currentRow = 1

  // Title (full width)
  ws.mergeCells(`A${currentRow}:G${currentRow}`)
  const titleCell = ws.getCell(`A${currentRow}`)
  titleCell.value = title || `التقرير من ${fromDate} إلى ${toDate}`
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: WHITE } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(currentRow).height = 40
  currentRow++

  // Gold separator
  ws.mergeCells(`A${currentRow}:G${currentRow}`)
  ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } }
  ws.getRow(currentRow).height = 4
  currentRow++

  // ══════════════════════════════════════════════
  // 1) REVENUE SUMMARY — full width rows
  // ══════════════════════════════════════════════
  const summaryRows = [
    { label: 'إجمالي الإيرادات', value: totalRevenue,  bg: 'FFF8E1' },
    { label: 'إجمالي المصروفات', value: totalExpenses, bg: RED_LIGHT },
    { label: 'صافي الإيرادات',   value: netRevenue,    bg: GREEN_MED },
  ]
  summaryRows.forEach(({ label, value, bg }) => {
    ws.mergeCells(`A${currentRow}:F${currentRow}`)
    const lc = ws.getCell(`A${currentRow}`)
    lc.value = label
    lc.font = { name: 'Arial', size: 11, bold: true }
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    lc.alignment = { horizontal: 'right', vertical: 'middle' }
    lc.border = thinBorder()

    const vc = ws.getCell(`G${currentRow}`)
    vc.value = value
    vc.numFmt = '#,##0.00" ج.م"'
    vc.font = { name: 'Arial', size: 11, bold: true }
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    vc.alignment = { horizontal: 'center', vertical: 'middle' }
    vc.border = thinBorder()
    ws.getRow(currentRow).height = 24
    currentRow++
  })

  // Net revenue full-width golden box
  ws.mergeCells(`A${currentRow}:G${currentRow}`)
  const netCell2 = ws.getCell(`A${currentRow}`)
  netCell2.value = `صافي الإيرادات:  ${netRevenue.toFixed(2)} ج.م`
  netCell2.font = { name: 'Arial', size: 13, bold: true, color: { argb: netRevenue >= 0 ? '1B5E20' : 'B71C1C' } }
  netCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: netRevenue >= 0 ? GREEN_MED : RED_LIGHT } }
  netCell2.alignment = { horizontal: 'center', vertical: 'middle' }
  netCell2.border = {
    top:    { style: 'medium', color: { argb: GOLD } },
    bottom: { style: 'medium', color: { argb: GOLD } },
    left:   { style: 'medium', color: { argb: GOLD } },
    right:  { style: 'medium', color: { argb: GOLD } },
  }
  ws.getRow(currentRow).height = 36
  currentRow++
  currentRow++ // spacer

  // ══════════════════════════════════════════════
  // 2) CATEGORY TOTALS (A-D)
  // ══════════════════════════════════════════════
  ws.mergeCells(`A${currentRow}:D${currentRow}`)
  const catTitleCell = ws.getCell(`A${currentRow}`)
  catTitleCell.value = categoryTotals.length > 0 ? 'ملخص المصروفات حسب الفئة' : 'ملخص المصروفات حسب الفئة (لا توجد مصروفات)'
  catTitleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: WHITE } }
  catTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
  catTitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(currentRow).height = 28
  currentRow++

  if (categoryTotals.length > 0) {
    for (const ct of categoryTotals) {
      ws.getCell(`A${currentRow}`).value = ct.category
      ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10, bold: true }
      ws.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' }
      ws.getCell(`A${currentRow}`).border = thinBorder()

      ws.getCell(`D${currentRow}`).value = ct.total
      ws.getCell(`D${currentRow}`).numFmt = '#,##0.00" ج.م"'
      ws.getCell(`D${currentRow}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'B71C1C' } }
      ws.getCell(`D${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`D${currentRow}`).border = thinBorder()
      ws.getRow(currentRow).height = 22
      currentRow++
    }

    ws.mergeCells(`A${currentRow}:C${currentRow}`)
    ws.getCell(`A${currentRow}`).value = 'إجمالي المصروفات'
    ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
    ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${currentRow}`).border = thinBorder()

    ws.getCell(`D${currentRow}`).value = totalExpenses
    ws.getCell(`D${currentRow}`).numFmt = '#,##0.00" ج.م"'
    ws.getCell(`D${currentRow}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    ws.getCell(`D${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
    ws.getCell(`D${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`D${currentRow}`).border = thinBorder()
    ws.getRow(currentRow).height = 26
    currentRow++
  }

  currentRow++ // spacer

  // ══════════════════════════════════════════════
  // 3) EXPENSES DETAIL (A-D)
  // ══════════════════════════════════════════════
  if (expenses.length > 0) {
    ;['#', 'اسم المصروف', 'الفئة', 'المبلغ'].forEach((h, i) => {
      const col = ['A', 'B', 'C', 'D'][i]
      ws.getCell(`${col}${currentRow}`).value = h
      ws.getCell(`${col}${currentRow}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
      ws.getCell(`${col}${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
      ws.getCell(`${col}${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`${col}${currentRow}`).border = thinBorder()
    })
    ws.getRow(currentRow).height = 28
    currentRow++

    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i]
      const bg = i % 2 === 0 ? RED_LIGHT : WHITE
      const vals: (string | number)[] = [i + 1, e.title, e.category, parseFloat(e.amount.toFixed(2))]
      ;['A', 'B', 'C', 'D'].forEach((col, ci) => {
        const c = ws.getCell(`${col}${currentRow}`)
        c.value = vals[ci]
        if (col === 'D') {
          c.numFmt = '#,##0.00" ج.م"'
          c.font = { name: 'Arial', size: 10, bold: true }
        } else { c.font = { name: 'Arial', size: 10 } }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        c.alignment = { horizontal: 'center', vertical: 'middle' }
        c.border = thinBorder()
      })
      ws.getRow(currentRow).height = 22
      currentRow++
    }

    ;['A', 'B', 'C', 'D'].forEach(col => {
      ws.getCell(`${col}${currentRow}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
      ws.getCell(`${col}${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } }
      ws.getCell(`${col}${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`${col}${currentRow}`).border = thinBorder()
    })
    ws.getCell(`A${currentRow}`).value = ''
    ws.getCell(`C${currentRow}`).value = 'الإجمالي'
    ws.getCell(`D${currentRow}`).value = totalExpenses
    ws.getCell(`D${currentRow}`).numFmt = '#,##0.00" ج.م"'
    ws.getRow(currentRow).height = 26
    currentRow++
    currentRow++ // spacer
  }

  // ══════════════════════════════════════════════
  // 4) DISCOUNTS (A-G, fully separate block)
  // ══════════════════════════════════════════════
  if (discountedOrders.length > 0 || totalDiscounts > 0) {
    ws.mergeCells(`A${currentRow}:G${currentRow}`)
    ws.getCell(`A${currentRow}`).value = `الخصومات (الإجمالي: ${totalDiscounts.toFixed(2)} ج.م)`
    ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 12, bold: true, color: { argb: WHITE } }
    ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C0392B' } }
    ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(currentRow).height = 28
    currentRow++

    ;['#', 'فاتورة', 'العميل', 'القيمة', 'النوع', 'السبب', 'بواسطة'].forEach((h, i) => {
      const col = ['A', 'B', 'C', 'D', 'E', 'F', 'G'][i]
      ws.getCell(`${col}${currentRow}`).value = h
      ws.getCell(`${col}${currentRow}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
      ws.getCell(`${col}${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C0392B' } }
      ws.getCell(`${col}${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`${col}${currentRow}`).border = thinBorder()
    })
    ws.getRow(currentRow).height = 24
    currentRow++

    for (let i = 0; i < discountedOrders.length; i++) {
      const d = discountedOrders[i]
      const bg = i % 2 === 0 ? 'FFF5F5' : WHITE
      const vals: (string | number)[] = [
        i + 1, `#${d.orderNumber}`, d.customerName || '-', d.discountAmount,
        d.discountType === 'PERCENTAGE' ? `${d.discountValue}%` : `${d.discountValue} ج.م`,
        d.discountReason || '-', d.discountAppliedBy || '-',
      ]
      ;['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col, ci) => {
        const c = ws.getCell(`${col}${currentRow}`)
        c.value = vals[ci]
        c.font = { name: 'Arial', size: 10 }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        c.alignment = { horizontal: 'center', vertical: 'middle' }
        c.border = thinBorder()
        if (col === 'D') {
          c.numFmt = '#,##0.00" ج.م"'
          c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'C0392B' } }
        }
      })
      ws.getRow(currentRow).height = 22
      currentRow++
    }

    // Total row — merge A-F for label, G for value (NO overlapping merges)
    ws.mergeCells(`A${currentRow}:F${currentRow}`)
    ws.getCell(`A${currentRow}`).value = 'إجمالي الخصومات'
    ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C0392B' } }
    ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    // Apply red bg + white font to entire row
    for (let ci = 1; ci <= 7; ci++) {
      const col = 'ABCDEFG'[ci - 1]
      const cell = ws.getCell(`${col}${currentRow}`)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C0392B' } }
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
      cell.border = thinBorder()
    }
    ws.getCell(`G${currentRow}`).value = totalDiscounts
    ws.getCell(`G${currentRow}`).numFmt = '#,##0.00" ج.م"'
    ws.getCell(`G${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(currentRow).height = 26
    currentRow++

    if (totalLoyaltyDiscounts > 0) {
      ws.mergeCells(`A${currentRow}:F${currentRow}`)
      ws.getCell(`A${currentRow}`).value = 'منها خصم نقاط الولاء'
      for (let ci = 1; ci <= 7; ci++) {
        const col = 'ABCDEFG'[ci - 1]
        const cell = ws.getCell(`${col}${currentRow}`)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_LIGHT } }
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'C0392B' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = thinBorder()
      }
      ws.getCell(`G${currentRow}`).value = totalLoyaltyDiscounts
      ws.getCell(`G${currentRow}`).numFmt = '#,##0.00" ج.م"'
      ws.getRow(currentRow).height = 24
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
