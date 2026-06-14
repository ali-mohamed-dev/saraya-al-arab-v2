import { test } from '@playwright/test'

test.setTimeout(120000)

const TABS = ['المنيو', 'الطلبات', 'الشيفت', 'الطاولات', 'العمال', 'المستخدمين', 'الموظفين', 'الحضور', 'التقارير', 'الإعدادات']

test('scan all admin tabs for UI/console issues', async ({ page }) => {
  // Collect console errors
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', err => consoleErrors.push(`[PAGE_ERROR] ${err.message}`))

  // Login
  await page.goto('/')
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /تسجيل/i }).click()
  await page.waitForTimeout(500)
  await page.getByText('دخول الموظفين').click()
  await page.waitForTimeout(500)
  await page.getByPlaceholder('admin').fill('admin')
  await page.getByPlaceholder('••••••••').fill('admin123')
  await page.getByRole('button', { name: 'دخول الموظفين', exact: true }).click()
  await page.waitForTimeout(2000)

  for (const tab of TABS) {
    console.log(`\n=== TAB: ${tab} ===`)

    // Click tab in the desktop tab bar
    await page.getByRole('button', { name: new RegExp(tab, 'i') }).first().click()
    // Wait for content to render (tabs like shift/reports need ~3s for API calls)
    await page.waitForTimeout(3500)

    // Check URL
    console.log(`URL: ${page.url()}`)

    // Get visible text (first 30 lines)
    const text = await page.evaluate(() => {
      const els = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, span, a, label, li, td, th, select, input, textarea')
      const lines: string[] = []
      els.forEach(el => {
        const t = (el as HTMLElement).innerText?.trim()
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          const inp = el as HTMLInputElement
          lines.push(`${el.tagName} "${inp.placeholder || inp.name || ''}" = "${inp.value?.slice(0, 30)}"`)
        } else if (t && t.length > 0) {
          lines.push(`${el.tagName}: "${t.slice(0, 100)}"`)
        }
      })
      return lines.slice(0, 80)
    })
    text.forEach(l => console.log(l))

    // Log any visible errors in the DOM
    const domErrors = await page.evaluate(() => {
      const errEls = document.querySelectorAll('[class*="error"], [class*="alert"], [role="alert"]')
      return Array.from(errEls).map(e => (e as HTMLElement).innerText?.trim()).filter(t => t)
    })
    if (domErrors.length > 0) {
      console.log('!!! DOM ERRORS:', domErrors)
    }
  }

  console.log('\n\n=== CONSOLE ERRORS ===')
  if (consoleErrors.length === 0) {
    console.log('No console errors found!')
  } else {
    consoleErrors.forEach(e => console.log(e))
  }
})
