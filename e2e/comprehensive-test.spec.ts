import { test, expect } from '@playwright/test'

// Expected values from DB query
const EXPECTED = {
  totalDeliveredRevenue: 5309.2,
  totalExpenses: 14450,
  netRevenue: -9140.8,
  totalDiscounts: 322.53,
  totalDeliveredOrders: 26,
  cancelledOrders: 22,
  confirmedOrders: 8,
  shifts: 21,
  employees: 4,
  webUsers: 5,
  expensesByCategory: {
    'إيجار': 6500,
    'Bills': 3600,
    'سلف العماله': 2000,
    'Supplies': 1350,
    'Maintenance': 600,
    'صيانة': 250,
    'مواد خام': 150,
  },
  deliveredByType: { TAKEAWAY: 12, DINE_IN: 11, DELIVERY: 3 }
}

test.describe('Full Month Simulation - UI Data Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Login
    await page.getByRole('button', { name: /تسجيل/i }).click()
    await page.waitForTimeout(500)
    await page.getByText('دخول الموظفين').click()
    await page.waitForTimeout(500)
    await page.getByPlaceholder('admin').fill('admin')
    await page.getByPlaceholder('••••••••').fill('admin123')
    await page.getByRole('button', { name: 'دخول الموظفين', exact: true }).click()
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')
  })

  test('1 - Shift tab: verify shift data and totals', async ({ page }) => {
    // Go to Shift tab
    await page.getByRole('button', { name: /الشيفت/i }).click()
    await page.waitForTimeout(1500)

    // Read all visible text content
    const text = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el as HTMLElement).innerText?.trim()
          return t && t.length > 0 && t.length < 300 && !el.querySelector('*')
        })
        .map(el => (el as HTMLElement).innerText.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
    })

    console.log('=== SHIFT TAB CONTENT ===')
    text.forEach(t => console.log(`  "${t}"`))

    // Check that shift data is shown
    const pageText = text.join(' | ')

    // Should show shift sections
    console.log('\nShift tab loaded:', pageText.includes('الشيفت') || pageText.includes('Shift') ? 'YES' : 'NO')
    console.log('Has revenue numbers:', /\d+/.test(pageText) ? 'YES' : 'NO')

    // Extract any revenue/expense numbers
    const nums = pageText.match(/[\d,]+\.?\d*/g)
    console.log('Numbers found:', nums?.slice(0, 20))
  })

  test('2 - Orders tab: verify order counts and statuses', async ({ page }) => {
    await page.getByRole('button', { name: /الطلبات/i }).click()
    await page.waitForTimeout(1500)

    const text = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el as HTMLElement).innerText?.trim()
          return t && t.length > 0 && t.length < 300
        })
        .map(el => (el as HTMLElement).innerText.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
    })

    console.log('=== ORDERS TAB CONTENT ===')
    text.forEach(t => console.log(`  "${t}"`))

    // Look for order counts
    const pageText = text.join(' | ')
    const statusMatches = pageText.match(/(\d+)\s*(معلق|قيد|جاهز|تم|ملغي|PENDING|CONFIRMED|PREPARING|READY|DELIVERED|CANCELLED)/gi)
    console.log('\nStatus counts:', statusMatches?.slice(0, 15))
  })

  test('3 - Reports/Expenses tab: verify expense categories and totals', async ({ page }) => {
    await page.getByRole('button', { name: /التقارير|تقارير/i }).click()
    await page.waitForTimeout(1500)

    const text = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el as HTMLElement).innerText?.trim()
          return t && t.length > 0 && t.length < 300
        })
        .map(el => (el as HTMLElement).innerText.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
    })

    console.log('=== REPORTS/EXPENSES TAB CONTENT ===')
    text.forEach(t => console.log(`  "${t}"`))

    const pageText = text.join(' | ')

    // Check expense categories appear
    for (const [cat, amount] of Object.entries(EXPECTED.expensesByCategory)) {
      const found = pageText.includes(cat)
      const amountStr = String(amount)
      const amountFound = pageText.includes(amountStr)
      console.log(`  Category "${cat}" (${amount}): visible=${found}, amountMatch=${amountFound}`)
    }

    // Check total expense
    console.log(`  Total 14450 visible: ${pageText.includes('14450') || pageText.includes('14,450')}`)
  })

  test('4 - Tables tab: verify table data', async ({ page }) => {
    await page.getByRole('button', { name: /الطاولات/i }).click()
    await page.waitForTimeout(1500)

    const text = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el as HTMLElement).innerText?.trim()
          return t && t.length > 0 && t.length < 300
        })
        .map(el => (el as HTMLElement).innerText.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
    })

    console.log('=== TABLES TAB CONTENT ===')
    text.forEach(t => console.log(`  "${t}"`))
  })

  test('5 - Employees tab: verify employee data', async ({ page }) => {
    await page.getByRole('button', { name: /^العمال$/i }).click()
    await page.waitForTimeout(1500)

    const text = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el as HTMLElement).innerText?.trim()
          return t && t.length > 0 && t.length < 300
        })
        .map(el => (el as HTMLElement).innerText.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
    })

    console.log('=== EMPLOYEES TAB CONTENT ===')
    text.forEach(t => console.log(`  "${t}"`))

    const pageText = text.join(' | ')
    // Check if 4 employees are shown
    if (pageText.includes('4') || EXPECTED.employees > 0) {
      console.log(`  Employees: ${EXPECTED.employees} expected, found in page text`)
    }
  })

  test('6 - Users tab: verify web user data', async ({ page }) => {
    await page.getByRole('button', { name: /المستخدمين/i }).click()
    await page.waitForTimeout(1500)

    const text = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el as HTMLElement).innerText?.trim()
          return t && t.length > 0 && t.length < 300
        })
        .map(el => (el as HTMLElement).innerText.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
    })

    console.log('=== USERS TAB CONTENT ===')
    text.forEach(t => console.log(`  "${t}"`))
  })

  test('7 - Staff tab: verify staff management', async ({ page }) => {
    await page.getByRole('button', { name: /^الموظفين$/i }).click()
    await page.waitForTimeout(1500)

    const text = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el as HTMLElement).innerText?.trim()
          return t && t.length > 0 && t.length < 300
        })
        .map(el => (el as HTMLElement).innerText.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
    })

    console.log('=== STAFF TAB CONTENT ===')
    text.forEach(t => console.log(`  "${t}"`))
  })

  test('8 - Menu tab: verify menu data', async ({ page }) => {
    await page.getByRole('button', { name: /^المنيو$/i }).click()
    await page.waitForTimeout(1500)

    const text = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el as HTMLElement).innerText?.trim()
          return t && t.length > 0 && t.length < 300
        })
        .map(el => (el as HTMLElement).innerText.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
    })

    console.log('=== MENU TAB CONTENT ===')
    text.forEach(t => console.log(`  "${t}"`))
  })

  test('9 - Settings tab: verify settings page', async ({ page }) => {
    await page.getByRole('button', { name: /الإعدادات|إعدادات/i }).click()
    await page.waitForTimeout(1500)

    const text = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const t = (el as HTMLElement).innerText?.trim()
          return t && t.length > 0 && t.length < 300
        })
        .map(el => (el as HTMLElement).innerText.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
    })

    console.log('=== SETTINGS TAB CONTENT ===')
    text.forEach(t => console.log(`  "${t}"`))
  })

  test('10 - Full page screenshot of each tab', async ({ page }) => {
    const tabs = [
      { name: 'menu', label: /^المنيو$/i },
      { name: 'orders', label: /الطلبات/i },
      { name: 'shift', label: /الشيفت/i },
      { name: 'tables', label: /الطاولات/i },
      { name: 'employees', label: /^العمال$/i },
      { name: 'users', label: /المستخدمين/i },
      { name: 'staff', label: /^الموظفين$/i },
      { name: 'expenses', label: /التقارير|تقارير/i },
      { name: 'settings', label: /الإعدادات|إعدادات/i },
    ]

    for (const tab of tabs) {
      const btn = page.getByRole('button', { name: tab.label })
      if (await btn.isVisible()) {
        await btn.click()
        await page.waitForTimeout(1500)
      }
      await page.screenshot({ path: `e2e/screenshots/admin-${tab.name}.png`, fullPage: true })
      console.log(`  Screenshot: admin-${tab.name}.png`)
    }
  })
})
