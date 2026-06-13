import { test, expect } from '@playwright/test'

test('explore UI structure', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)

  const info = await page.evaluate(() => {
    const allText: string[] = []
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, span, a, label, li, td, th').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim()
      if (text && text.length > 0) allText.push(`${el.tagName}: "${text.slice(0, 80)}"`)
    })
    return allText.slice(0, 50)
  })

  console.log('=== PAGE CONTENT ===')
  info.forEach(line => console.log(line))

  console.log('\n=== BUTTONS ===')
  const buttons = await page.locator('button').allInnerTexts()
  buttons.forEach(b => console.log(`  button: "${b}"`))

  console.log('\n=== INPUTS ===')
  const inputs = await page.locator('input, select, textarea').evaluateAll(els =>
    els.map(el => ({
      tag: el.tagName,
      type: (el as HTMLInputElement).type || '',
      placeholder: (el as HTMLInputElement).placeholder || '',
      name: (el as HTMLInputElement).name || '',
    }))
  )
  inputs.forEach(i => console.log(`  ${i.tag} type="${i.type}" placeholder="${i.placeholder}" name="${i.name}"`))

  console.log('\n=== CLASSES ON BODY ===')
  const bodyClass = await page.evaluate(() => document.body.className)
  console.log(`  body class: "${bodyClass}"`)

  console.log('\n=== LINKS ===')
  const links = await page.locator('a').evaluateAll(els =>
    els.map(el => ({ text: (el as HTMLElement).innerText?.trim(), href: (el as HTMLAnchorElement).href }))
  )
  links.forEach(l => console.log(`  a: "${l.text}" -> ${l.href}`))
})
