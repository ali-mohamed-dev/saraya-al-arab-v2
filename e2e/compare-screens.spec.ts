import { test } from '@playwright/test'

test.setTimeout(120000)

test('verify admin shows orders correctly', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  // Login
  await page.goto('/')
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /تسجيل/i }).click()
  await page.waitForTimeout(500)
  await page.locator('text=دخول الموظفين').click()
  await page.waitForTimeout(500)
  await page.getByPlaceholder('admin').fill('admin')
  await page.getByPlaceholder('••••••••').fill('admin123')
  await page.getByRole('button', { name: 'دخول الموظفين', exact: true }).click()
  await page.waitForTimeout(2000)

  // Click orders tab
  await page.getByRole('button', { name: /الطلبات/i }).first().click()
  await page.waitForTimeout(5000)

  // Debug: check what's visible
  const visible = await page.evaluate(() => {
    // Get all API-like data from the page
    const body = document.body.innerText
    // Check for key indicators
    return {
      hasNoOrders: body.includes('لا توجد طلبات'),
      hasOrders: body.includes('طلب'),
      hasRevenue: body.includes('إيراد'),
      hasStats: body.includes('إجمالي'),
      allText: body.slice(0, 3000),
    }
  })
  console.log('Visible text (first 3000 chars):')
  console.log(visible.allText)

  // Wait for order #7 specifically
  const foundOrder7 = await page.waitForSelector('text=#7', { timeout: 10000 }).catch(() => null)
  console.log(`\nOrder #7 found: ${!!foundOrder7}`)

  // Wait for non-empty stats
  const statsUpdated = await page.waitForFunction(() => {
    const statsEls = document.querySelectorAll('[class*="stat"]')
    const bodyText = document.body.innerText
    // If the page doesn't say "لا توجد طلبات" and has some numbers, it's loaded
    const hasOrdersSection = !bodyText.includes('لا توجد طلبات') && bodyText.includes('طلب')
    return hasOrdersSection
  }, { timeout: 15000 }).catch(() => false)
  console.log(`Stats updated with orders: ${!!statsUpdated}`)

  if (statsUpdated) {
    const afterUpdate = await page.evaluate(() => {
      const body = document.body.innerText
      // Return sections around order info
      const relevant = body.split('\n').filter(l => 
        l.includes('طلب') || l.includes('#') || l.includes('إيراد') || 
        l.includes('ج.م') || l.includes('جد') || l.includes('DELIVERED') ||
        l.includes('مسلم') || l.includes('صالة') || l.includes('تيك')
      )
      return relevant.slice(0, 30)
    })
    console.log('\nRelevant data after update:')
    afterUpdate.forEach((l: string, i: number) => console.log(`  [${i}] ${l.trim()}`))
  }

  if (consoleErrors.length > 0) {
    console.log('\nConsole errors:', consoleErrors)
  }
})
