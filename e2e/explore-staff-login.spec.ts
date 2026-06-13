import { test } from '@playwright/test'

test('explore staff login', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /تسجيل/i }).click()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /دخول الموظفين/i }).click()
  await page.waitForTimeout(1500)

  console.log('=== STAFF LOGIN DIALOG ===')
  const text = await page.evaluate(() => {
    const all: string[] = []
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, span, a, label, li, td, th, div[class*="card"], div[class*="dialog"], div[class*="modal"], input').forEach(el => {
      const t = (el as HTMLElement).innerText?.trim()
      if (t && t.length > 0) all.push(`${el.tagName}: "${t.slice(0, 120)}"`)
      if (el.tagName === 'INPUT') {
        const inp = el as HTMLInputElement
        all.push(`INPUT: type="${inp.type}" placeholder="${inp.placeholder}" name="${inp.name}" id="${inp.id}"`)
      }
    })
    return all.slice(0, 60)
  })
  text.forEach(l => console.log(l))

  console.log('\n=== ALL BUTTONS ===')
  const btns = await page.locator('button').allInnerTexts()
  btns.forEach(b => console.log(`  button: "${b.replace(/\n/g, '\\n')}"`))
})
