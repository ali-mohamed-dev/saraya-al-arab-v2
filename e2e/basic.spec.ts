import { test, expect } from '@playwright/test'

test.describe('Top Restaurant App', () => {
  test('homepage loads and shows menu', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('staff login works', async ({ page }) => {
    await page.goto('/')

    // Click "تسجيل" to open login dialog
    const loginTrigger = page.getByRole('button', { name: 'تسجيل' }).first()
    await loginTrigger.click({ timeout: 5000 })
    await page.waitForTimeout(500)

    // Click "دخول الموظفين" to show staff form
    await page.getByRole('button', { name: 'دخول الموظفين', exact: true }).click()
    await page.waitForTimeout(500)

    await page.waitForTimeout(500)
    const usernameInput = page.locator('input[placeholder="admin"]')
    await usernameInput.fill('admin')

    const passwordInput = page.locator('input[placeholder="••••••••"]')
    await passwordInput.fill('admin123')

    const loginBtn = page.getByRole('button', { name: 'دخول الموظفين', exact: true }).last()
    await loginBtn.click()

    await expect(page.getByText(/لوحة التحكم/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('menu items are displayed', async ({ page }) => {
    await page.goto('/')
    const menuItems = page.locator('[class*="meal"], [class*="menu-item"], [class*="card"]').first()
    await expect(menuItems).toBeVisible({ timeout: 10000 })
  })
})
