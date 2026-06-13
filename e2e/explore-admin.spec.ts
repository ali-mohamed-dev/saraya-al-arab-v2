import { test } from '@playwright/test'

test('login as admin and explore panels', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /تسجيل/i }).click()
  await page.waitForTimeout(800)

  // Click "دخول الموظفين" to show form
  const showStaffBtn = page.getByRole('button', { name: 'دخول الموظفين', exact: true })
  await showStaffBtn.click()
  await page.waitForTimeout(500)

  // Fill credentials
  await page.waitForTimeout(500)
  const usernameInput = page.locator('input[placeholder="admin"]')
  await usernameInput.fill('admin')
  const passwordInput = page.locator('input[placeholder="••••••••"]')
  await passwordInput.fill('admin123')

  // Click submit button - use the last "دخول الموظفين" button (the submit one)
  const submitBtn = page.getByRole('button', { name: 'دخول الموظفين', exact: true })
  await submitBtn.click()
  await page.waitForTimeout(3000)

  console.log('=== ADMIN PANEL ===')
  const text = await page.evaluate(() => {
    const all: string[] = []
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, span, a, label, li, td, th, [class*="tab"], [class*="card"], [role="tab"]').forEach(el => {
      const t = (el as HTMLElement).innerText?.trim()
      if (t && t.length > 0) all.push(`${el.tagName}: "${t.slice(0, 150)}"`)
    })
    return all.slice(0, 80)
  })
  text.forEach(l => console.log(l))

  console.log('\n=== ALL BUTTONS ===')
  const btns = await page.locator('button').allInnerTexts()
  btns.forEach(b => console.log(`  button: "${b.replace(/\n/g, '\\n').slice(0, 120)}"`))
})
