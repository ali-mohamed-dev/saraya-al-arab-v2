import { test } from '@playwright/test'

test('login as admin and show panels', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)

  // Click تسجيل
  await page.getByRole('button', { name: /تسجيل/i }).click()
  await page.waitForTimeout(500)

  // Click "دخول الموظفين" to show form
  await page.getByText('دخول الموظفين').click()
  await page.waitForTimeout(500)

  // Fill form — use getByPlaceholder for robustness
  await page.getByPlaceholder('admin').fill('admin')
  await page.getByPlaceholder('••••••••').fill('admin123')

  // Click submit
  await page.getByRole('button', { name: 'دخول الموظفين', exact: true }).click()
  await page.waitForTimeout(3000)

  console.log('=== ADMIN PANEL CONTENT ===')
  const text = await page.evaluate(() => {
    const all: string[] = []
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, span, a, label, li, td, th, [role="tab"], [role="tablist"]').forEach(el => {
      const t = (el as HTMLElement).innerText?.trim()
      if (t && t.length > 0) all.push(`${el.tagName}: "${t.slice(0, 200)}"`)
    })
    return all.slice(0, 120)
  })
  text.forEach(l => console.log(l))

  console.log('\n=== ALL BUTTONS (tabs/actions) ===')
  const btns = await page.locator('button').allInnerTexts()
  btns.forEach(b => {
    const t = b.replace(/\n/g, ' | ').trim()
    if (t) console.log(`  button: "${t.slice(0, 120)}"`)
  })
})
