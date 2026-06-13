import { test } from '@playwright/test'

test('debug staff login form', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /تسجيل/i }).click()
  await page.waitForTimeout(1000)

  console.log('=== BEFORE STAFF CLICK ===')
  const before = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText?.trim().replace(/\n/g, ' | '),
      classes: b.className?.slice(0, 80),
      visible: b.offsetParent !== null,
      rect: b.getBoundingClientRect().height > 0 ? 'visible' : 'hidden'
    }))
  })
  before.forEach(b => console.log(`  visible=${b.visible} cls="${b.classes}" text="${b.text}"`))

  // Get all buttons by text
  const staffBtns = page.getByRole('button', { name: /دخول الموظفين/i })
  console.log(`\nButtons matching "دخول الموظفين": ${await staffBtns.count()}`)
  for (let i = 0; i < await staffBtns.count(); i++) {
    const btn = staffBtns.nth(i)
    const visible = await btn.isVisible()
    const text = await btn.innerText()
    console.log(`  [${i}] visible=${visible} text="${text}"`)
  }

  // Click the first visible one
  const showBtn = staffBtns.first()
  await showBtn.click()
  await page.waitForTimeout(1000)

  console.log('\n=== AFTER STAFF CLICK ===')
  const after = await page.evaluate(() => {
    const all: string[] = []
    document.querySelectorAll('input, button, label').forEach(el => {
      if (el.tagName === 'INPUT') {
        const inp = el as HTMLInputElement
        all.push(`INPUT type="${inp.type}" ph="${inp.placeholder}" visible=${inp.offsetParent !== null}`)
      } else if (el.tagName === 'BUTTON') {
        all.push(`BUTTON text="${(el as HTMLElement).innerText?.trim().replace(/\n/g,' | ')}" visible=${(el as HTMLElement).offsetParent !== null}`)
      } else {
        const t = (el as HTMLElement).innerText?.trim()
        if (t) all.push(`LABEL text="${t}"`)
      }
    })
    return all
  })
  after.forEach(l => console.log(`  ${l}`))
})
