import { test, expect } from '@playwright/test'

test('extract reports page', async ({ page }) => {
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
  await page.waitForTimeout(1500)

  // Check current URL
  console.log('URL before tab click:', page.url())

  // Click التقارير tab
  await page.getByRole('button', { name: /التقارير/i }).click()
  await page.waitForTimeout(1000)

  // Check URL after
  console.log('URL after tab click:', page.url())

  // Wait for reports content to load
  await page.waitForTimeout(4000)

  // Check URL again
  console.log('URL after wait:', page.url())

  // Get all visible content
  console.log('\n=== FULL PAGE TEXT ===')
  const text = await page.evaluate(() => document.body.innerText)
  console.log(text.slice(0, 5000))
})
