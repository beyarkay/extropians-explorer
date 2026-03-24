import { test, expect } from '@playwright/test'

test.describe('About Page', () => {
  test('loads and shows content sections', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'The Extropians Mailing List' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Context.*Mailing Lists/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Notable Participants' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'About This Website' })).toBeVisible()
  })

  test('shows live stats from the database', async ({ page }) => {
    await page.goto('/about')
    await page.waitForTimeout(500)

    // Should show actual numbers
    await expect(page.getByText(/[\d,]+ messages/)).toBeVisible()
    await expect(page.getByText(/[\d,]+ unique authors/)).toBeVisible()
  })

  test('notable participants link to author profiles', async ({ page }) => {
    await page.goto('/about')

    const yudkowskyLink = page.locator('a:has-text("Eliezer Yudkowsky")').first()
    await expect(yudkowskyLink).toBeVisible()
    const href = await yudkowskyLink.getAttribute('href')
    expect(href).toContain('/author/Eliezer')
  })

  test('notable participants have Wikipedia links', async ({ page }) => {
    await page.goto('/about')

    const wikiLinks = page.locator('a:has-text("Wikipedia")')
    const count = await wikiLinks.count()
    expect(count).toBeGreaterThan(8)

    // Check one specific Wikipedia link
    const finneyWiki = page.locator('a[href*="wikipedia.org/wiki/Hal_Finney"]')
    await expect(finneyWiki).toBeVisible()
  })

  test('topic links navigate to filtered timeline', async ({ page }) => {
    await page.goto('/about')

    const cryptoLink = page.locator('a[href="/?tag=crypto"]').first()
    await expect(cryptoLink).toBeVisible()
    await cryptoLink.click()
    await expect(page).toHaveURL(/tag=crypto/)
  })

  test('feature links navigate to correct pages', async ({ page }) => {
    await page.goto('/about')

    // "Author profiles" should link to /authors
    const authorsLink = page.locator('a[href="/authors"]:has-text("Author profiles")')
    await expect(authorsLink).toBeVisible()
  })

  test('navigation from header works', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'About' }).click()
    await expect(page).toHaveURL('/about')
  })
})
