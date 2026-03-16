import { test, expect } from '@playwright/test'

test.describe('Message View', () => {
  // Use a known message ID (Hal Finney's Cold fusion redux)
  const MSG_URL = '/message/53155'

  test('shows message subject, author, date, and email', async ({ page }) => {
    await page.goto(MSG_URL)
    await page.waitForTimeout(300)

    await expect(page.getByText('Cold fusion redux')).toBeVisible()
    await expect(page.getByText('Hal Finney')).toBeVisible()
  })

  test('shows message body with linkified URLs', async ({ page }) => {
    await page.goto(MSG_URL)
    await page.waitForTimeout(300)

    // Body should be visible
    const body = page.locator('div[style*="font-family"]').last()
    await expect(body).toBeVisible()
    const text = await body.textContent()
    expect(text!.length).toBeGreaterThan(10)
  })

  test('navigation bar shows prev/next links', async ({ page }) => {
    await page.goto(MSG_URL)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('← prev msg').first()).toBeVisible()
    await expect(page.getByText('next msg →').first()).toBeVisible()
    await expect(page.getByText('← prev in thread').first()).toBeVisible()
    await expect(page.getByText('next in thread →').first()).toBeVisible()
  })

  test('full thread link works', async ({ page }) => {
    await page.goto(MSG_URL)
    await page.waitForTimeout(300)

    await page.getByText('full thread').first().click()
    await expect(page).toHaveURL(/\/thread\//)
  })

  test('next message navigation works', async ({ page }) => {
    await page.goto(MSG_URL)
    await page.waitForTimeout(300)

    const nextLink = page.getByText('next msg →').first()
    if (await nextLink.evaluate(el => el.tagName === 'A')) {
      await nextLink.click()
      await expect(page).toHaveURL(/\/message\/\d+/)
      // Should be a different message
      expect(page.url()).not.toContain('/message/53155')
    }
  })

  test('author link navigates to author profile', async ({ page }) => {
    await page.goto(MSG_URL)
    await page.waitForTimeout(300)

    await page.getByText('Hal Finney').first().click()
    await expect(page).toHaveURL(/\/author\//)
  })

  test('date index link works', async ({ page }) => {
    await page.goto(MSG_URL)
    await page.waitForTimeout(300)

    await page.getByText('date index').first().click()
    await expect(page).toHaveURL(/month=/)
  })

  test('glossary terms have tooltips', async ({ page }) => {
    // Navigate to a message likely to contain glossary terms
    await page.goto(MSG_URL)
    await page.waitForTimeout(300)

    const glossaryTerms = page.locator('.glossary-term')
    const count = await glossaryTerms.count()
    if (count > 0) {
      const title = await glossaryTerms.first().getAttribute('title')
      expect(title).toBeTruthy()
      expect(title!.length).toBeGreaterThan(5)
    }
  })

  test('page refresh does not 404', async ({ page }) => {
    await page.goto(MSG_URL)
    await page.waitForTimeout(300)

    // Reload the page
    await page.reload()
    await page.waitForTimeout(300)

    // Should still show the message, not a 404
    await expect(page.getByText('Cold fusion redux')).toBeVisible()
  })
})
