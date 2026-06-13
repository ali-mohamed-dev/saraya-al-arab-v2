import { test } from '@playwright/test'

test('extract reports page data', async ({ page }) => {
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

  // Navigate to التقارير tab
  await page.getByRole('button', { name: /التقارير/i }).click()
  await page.waitForTimeout(2000)

  console.log('=== REPORTS PAGE TITLE ===')
  const title = await page.locator('h1, h2').first().innerText()
  console.log(`Title: "${title}"`)

  // Get current date filter info
  console.log('\n=== DATE FILTER ===')
  const dateInfo = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      id: s.id,
      name: s.name,
      value: s.value,
      options: Array.from(s.options).slice(0, 5).map(o => `${o.value}:${o.text}`)
    }))
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="date"]')).map(i => ({
      id: i.id,
      type: (i as HTMLInputElement).type,
      value: (i as HTMLInputElement).value,
      placeholder: (i as HTMLInputElement).placeholder
    }))
    const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText?.trim().replace(/\n/g, ' | ')).filter(t => t)
    return { selects, inputs, btns: btns.slice(0, 20) }
  })
  console.log('Selects:', JSON.stringify(dateInfo.selects, null, 2))
  console.log('Inputs:', JSON.stringify(dateInfo.inputs, null, 2))
  console.log('Buttons:', dateInfo.btns)

  // Get all summary cards
  console.log('\n=== SUMMARY CARDS ===')
  const cards = await page.evaluate(() => {
    const all: {text: string, value?: string}[] = []
    document.querySelectorAll('[class*="card"]').forEach(card => {
      const text = (card as HTMLElement).innerText?.trim()
      if (text) all.push({ text: text.slice(0, 200) })
    })
    return all
  })
  cards.forEach(c => console.log(`Card: "${c.text}"`))

  // Get all visible numbers/amounts with context
  console.log('\n=== ALL NUMBER VALUES WITH CONTEXT ===')
  const values = await page.evaluate(() => {
    const all: string[] = []
    document.querySelectorAll('*').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim()
      if (text && /\d+\.?\d*\s*ج\.م/.test(text)) {
        all.push(`${el.tagName}: "${text.slice(0, 120)}"`)
      }
    })
    return all.slice(0, 40)
  })
  values.forEach(v => console.log(v))

  // Get ALL text content for complete picture
  console.log('\n=== ALL VISIBLE TEXT ===')
  const allText = await page.evaluate(() => {
    const all: string[] = []
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button, div[class*="card"], div[class*="summary"], div[class*="stat"], th, td, label').forEach(el => {
      const t = (el as HTMLElement).innerText?.trim()
      if (t && t.length > 0) all.push(`${el.tagName}: "${t.slice(0, 200)}"`)
    })
    return all.slice(0, 150)
  })
  allText.forEach(l => console.log(l))
})
