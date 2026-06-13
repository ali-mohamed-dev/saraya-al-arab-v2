import { test } from '@playwright/test'

test('explore login flow', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)

  // Click "تسجيل" button
  const signupBtn = page.getByRole('button', { name: /تسجيل/i })
  await signupBtn.click()
  await page.waitForTimeout(1500)

  const info = await page.evaluate(() => {
    const allText: string[] = []
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, span, a, label, li, td, th, div[class*="card"], div[class*="dialog"], div[class*="modal"]').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim()
      if (text && text.length > 0) allText.push(`${el.tagName}: "${text.slice(0, 100)}"`)
    })
    return allText.slice(0, 80)
  })

  console.log('=== AFTER CLICKING تسجيل ===')
  info.forEach(line => console.log(line))

  console.log('\n=== ALL BUTTONS ===')
  const buttons = await page.locator('button').allInnerTexts()
  buttons.forEach(b => console.log(`  button: "${b.replace(/\n/g, '\\n')}"`))

  console.log('\n=== ALL INPUTS ===')
  const inputs = await page.locator('input, select, textarea').evaluateAll(els =>
    els.map(el => ({
      tag: el.tagName,
      type: (el as HTMLInputElement).type || '',
      placeholder: (el as HTMLInputElement).placeholder || '',
      name: (el as HTMLInputElement).name || '',
      id: el.id || '',
    }))
  )
  inputs.forEach(i => console.log(`  ${i.tag} type="${i.type}" placeholder="${i.placeholder}" name="${i.name}" id="${i.id}"`))
})
