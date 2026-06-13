import { test } from '@playwright/test'

test('Check API responses from admin panel', async ({ page }) => {
  // Intercept all API calls
  const apiCalls: { url: string, status: number, body: string }[] = []
  
  page.on('response', async response => {
    const url = response.url()
    if (url.includes('/api/')) {
      let body = ''
      try {
        body = (await response.text()).slice(0, 500)
      } catch {}
      apiCalls.push({ url, status: response.status(), body })
    }
  })

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
  await page.waitForTimeout(3000)
  await page.waitForLoadState('networkidle')

  // Clear previous API calls (login)
  apiCalls.length = 0

  // Visit each tab and capture API calls
  const tabs = [
    { name: 'shift', label: /الشيفت/i },
    { name: 'orders', label: /الطلبات/i },
    { name: 'reports', label: /التقارير|تقارير/i },
    { name: 'employees', label: /^العمال$/i },
    { name: 'users', label: /المستخدمين/i },
    { name: 'staff', label: /^الموظفين$/i },
  ]

  for (const tab of tabs) {
    apiCalls.length = 0
    const btn = page.getByRole('button', { name: tab.label })
    if (await btn.isVisible()) {
      await btn.click()
      await page.waitForTimeout(3000)
    }
    
    console.log(`\n=== API calls for ${tab.name} tab ===`)
    for (const call of apiCalls) {
      console.log(`  [${call.status}] ${call.url}`)
      if (call.status >= 400) {
        console.log(`    ERROR: ${call.body.slice(0, 300)}`)
      } else {
        console.log(`    Body: ${call.body.slice(0, 200)}`)
      }
    }
    
    // Also get page text
    const bodyText = await page.locator('body').innerText()
    console.log(`  Page text (first 500 chars): ${bodyText.slice(0, 500)}`)
  }
})
