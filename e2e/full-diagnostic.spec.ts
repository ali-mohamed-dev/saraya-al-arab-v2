import { test, expect } from '@playwright/test'

const ADMIN_TABS = [
  { name: 'menu', label: /^المنيو$/i },
  { name: 'orders', label: /الطلبات/i },
  { name: 'shift', label: /الشيفت/i },
  { name: 'tables', label: /الطاولات/i },
  { name: 'employees', label: /^العمال$/i },
  { name: 'users', label: /المستخدمين/i },
  { name: 'staff', label: /^الموظفين$/i },
  { name: 'reports', label: /التقارير|تقارير/i },
  { name: 'settings', label: /الإعدادات|إعدادات/i },
]

test.describe('Full Diagnostic Scan', () => {
  let allErrors: string[] = []
  let apiFailures: string[] = []

  test.beforeEach(async ({ page }) => {
    allErrors = []
    apiFailures = []

    // Trap console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        allErrors.push(`[CONSOLE] ${msg.text()}`)
      }
    })
    page.on('pageerror', err => {
      allErrors.push(`[PAGE_ERROR] ${err.message}`)
    })
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('/api/')) {
        apiFailures.push(`[API ${response.status()}] ${response.url()}`)
      }
    })
  })

  test('1 - Login and scan admin', async ({ page }) => {
    // Navigate
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    console.log('Page loaded, URL:', page.url())

    // Click تسجيل الدخول
    const loginBtn = page.getByRole('button', { name: /تسجيل/i })
    if (await loginBtn.isVisible()) {
      await loginBtn.click()
      await page.waitForTimeout(1000)
    }

    // Click دخول الموظفين
    const staffBtn = page.getByText('دخول الموظفين')
    if (await staffBtn.isVisible()) {
      await staffBtn.click()
      await page.waitForTimeout(1000)
    }

    // Fill login form
    await page.getByPlaceholder('admin').fill('admin')
    await page.getByPlaceholder('••••••••').fill('admin123')

    // Submit
    await page.getByRole('button', { name: 'دخول الموظفين', exact: true }).click()
    await page.waitForTimeout(3000)
    await page.waitForLoadState('networkidle')

    console.log('Logged in, URL:', page.url())
    console.log('All API calls so far:')

    // Take initial screenshot
    await page.screenshot({ path: 'e2e/screenshots/diag-after-login.png', fullPage: true })
    console.log('Screenshot: diag-after-login.png')

    // Scan each tab
    for (const tab of ADMIN_TABS) {
      console.log(`\n========== TAB: ${tab.name} ==========`)
      const tabErrorsBefore = allErrors.length
      const apiFailuresBefore = apiFailures.length

      // Try to click the tab button
      const btn = page.getByRole('button', { name: tab.label })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(2000)
        await page.waitForLoadState('networkidle')
      } else {
        console.log(`  WARNING: Button for tab "${tab.name}" not found via role`)
        // Try text match
        const textBtn = page.locator(`button:has-text("${tab.label.source}")`).first()
        if (await textBtn.isVisible().catch(() => false)) {
          await textBtn.click()
          await page.waitForTimeout(2000)
        } else {
          console.log(`  FAILED: Cannot find tab "${tab.name}"`)
          continue
        }
      }

      // Take screenshot
      await page.screenshot({ path: `e2e/screenshots/diag-${tab.name}.png`, fullPage: true })
      console.log(`Screenshot: diag-${tab.name}.png`)

      // Check for visible errors
      const domErrors = await page.evaluate(() => {
        const errEls = document.querySelectorAll('[class*="error"], [class*="alert"], [role="alert"], [class*="destructive"]')
        return Array.from(errEls).map(e => (e as HTMLElement).innerText?.trim()).filter(t => t)
      })
      if (domErrors.length > 0) {
        console.log(`  DOM ERRORS:`, domErrors)
      }

      // Check for network errors
      const newApiErrors = apiFailures.slice(apiFailuresBefore)
      if (newApiErrors.length > 0) {
        console.log(`  API FAILURES:`)
        newApiErrors.forEach(e => console.log(`    ${e}`))
      }

      // Check for broken images
      const brokenImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
          .filter(img => !img.complete || img.naturalWidth === 0)
          .map(img => img.src)
      })
      if (brokenImages.length > 0) {
        console.log(`  BROKEN IMAGES:`, brokenImages)
      }

      // Check console errors
      const newConsoleErrors = allErrors.slice(tabErrorsBefore)
      if (newConsoleErrors.length > 0) {
        console.log(`  CONSOLE ERRORS:`)
        newConsoleErrors.forEach(e => console.log(`    ${e}`))
      }

      // Check for empty content
      const bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '')
      if (!bodyText || bodyText.length < 50) {
        console.log(`  WARNING: Page content seems empty (${bodyText.length} chars)`)
      }
    }

    // Summary
    console.log(`\n\n========== SCAN SUMMARY ==========`)
    console.log(`Total tabs scanned: ${ADMIN_TABS.length}`)
    console.log(`Total console errors: ${allErrors.length}`)
    console.log(`Total API failures: ${apiFailures.length}`)
    
    if (allErrors.length > 0) {
      console.log(`\n--- ALL CONSOLE ERRORS ---`)
      allErrors.forEach(e => console.log(e))
    }
    if (apiFailures.length > 0) {
      console.log(`\n--- ALL API FAILURES ---`)
      apiFailures.forEach(e => console.log(e))
    }

    console.log(`\nScreenshots saved in e2e/screenshots/`)
  })
})
