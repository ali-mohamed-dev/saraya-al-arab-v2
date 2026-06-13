import { test, expect } from '@playwright/test'

test.describe('Data Accuracy Check - Shift & Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /تسجيل/i }).click()
    await page.waitForTimeout(500)
    await page.getByText('دخول الموظفين').click()
    await page.waitForTimeout(500)
    await page.getByPlaceholder('admin').fill('admin')
    await page.getByPlaceholder('••••••••').fill('admin123')
    await page.getByRole('button', { name: 'دخول الموظفين', exact: true }).click()
    await page.waitForTimeout(3000)
    await page.waitForLoadState('networkidle')
  })

  test('Shift tab: revenue, expenses, net displayed', async ({ page }) => {
    await page.getByRole('button', { name: /الشيفت/i }).click()
    await page.waitForTimeout(3000)

    // Extract ALL text including numbers
    const bodyText = await page.locator('body').innerText()
    console.log('=== SHIFT TAB TEXT ===')
    console.log(bodyText)

    // Look for revenue, expenses, net patterns
    const lines = bodyText.split('\n').filter(l => l.trim()).map(l => l.trim())
    console.log('\n=== ALL LINES ===')
    lines.forEach((l, i) => console.log(`${i}: "${l}"`))

    // Check for key financial terms
    const hasRevenue = bodyText.includes('إيراد') || bodyText.includes('Revenue') || bodyText.includes('total')
    const hasExpenses = bodyText.includes('مصروفات') || bodyText.includes('Expenses') || bodyText.includes('expense')
    const hasNet = bodyText.includes('صافي') || bodyText.includes('Net') || bodyText.includes('net')
    console.log('\nFinancial terms found:', { hasRevenue, hasExpenses, hasNet })

    // Find all numbers
    const numbers = bodyText.match(/[\d,]+\.?\d*/g)
    console.log('All numbers:', numbers)
  })

  test('Reports tab: expenses breakdown visible', async ({ page }) => {
    await page.getByRole('button', { name: /التقارير|تقارير/i }).click()
    await page.waitForTimeout(3000)

    const bodyText = await page.locator('body').innerText()
    console.log('=== REPORTS TAB TEXT ===')
    console.log(bodyText)

    const lines = bodyText.split('\n').filter(l => l.trim()).map(l => l.trim())
    console.log('\n=== ALL LINES ===')
    lines.forEach((l, i) => console.log(`${i}: "${l}"`))

    const numbers = bodyText.match(/[\d,]+\.?\d*/g)
    console.log('All numbers:', numbers)

    // Check for expense categories
    const categories = ['إيجار', 'Bills', 'سلف', 'Supplies', 'Maintenance', 'صيانة', 'مواد خام']
    console.log('\nCategory presence:')
    categories.forEach(c => console.log(`  "${c}": ${bodyText.includes(c)}`))
  })

  test('Orders tab: verify order stats', async ({ page }) => {
    await page.getByRole('button', { name: /الطلبات/i }).click()
    await page.waitForTimeout(3000)

    const bodyText = await page.locator('body').innerText()
    console.log('=== ORDERS TAB TEXT ===')
    console.log(bodyText.slice(0, 3000))
  })
})
