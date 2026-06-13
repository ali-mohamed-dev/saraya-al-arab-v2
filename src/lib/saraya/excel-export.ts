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
  const { shift, orders, expenses, totalRevenue, totalExpenses, netRevenue } = opts

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Top'
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
  titleCell.value = 'تقرير شيفت توب '
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

  ;['#', 'اسم المصروف', 'الفئة', 'المبلغ'].forEach((h, i) => {
    const col = ['A', 'B', 'C', 'D'][i]
    const c = ws.getCell(`${col}${headerRow}`)
    c.value = h
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = thinBorder()
  })

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

  // ─── بيانات الطلبات ─────────────────────────────
  if (orders.length > 0) {
    expRow++ // spacer
    // Header: use columns A-C (F-G is for summary)
    const orderHeaderRow = expRow
    ;['#', 'الحالة', 'الإجمالي'].forEach((h, i) => {
      const col = ['A', 'B', 'C'][i]
      const c = ws.getCell(`${col}${orderHeaderRow}`)
      c.value = h
      c.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
      c.border = thinBorder()
    })
    // Clear any old F/G values on this row (summary might overlap)
    ;['F', 'G'].forEach(col => {
      ws.getCell(`${col}${orderHeaderRow}`).value = ''
    })
    ws.getRow(orderHeaderRow).height = 28
    expRow++

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i]
      const bg = i % 2 === 0 ? 'F5F5F5' : WHITE
      const vals: (string | number)[] = [i + 1, ORDER_STATUS_AR[o.status] || o.status, o.total]
      ;['A', 'B', 'C'].forEach((col, ci) => {
        const c = ws.getCell(`${col}${expRow}`)
        c.value = vals[ci]
        if (col === 'C') {
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
  }

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
