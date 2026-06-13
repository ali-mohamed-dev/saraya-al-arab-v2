import { test } from '@playwright/test'
import path from 'path'

test('screenshot the app', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'homepage.png'), fullPage: true })
})
