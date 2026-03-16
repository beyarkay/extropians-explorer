import { test, expect } from '@playwright/test'

test.describe('Global Navigation', () => {
  test('header shows app title and nav links', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.app-header h1')).toContainText('Extropians')
    await expect(page.getByRole('link', { name: 'Timeline' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Authors' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Glossary' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible()
  })

  test('nav links highlight active page', async ({ page }) => {
    await page.goto('/authors')
    const authorsLink = page.locator('.app-header nav a.active')
    await expect(authorsLink).toContainText('Authors')
  })

  test('search box is always visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.search-box input')).toBeVisible()

    await page.goto('/authors')
    await expect(page.locator('.search-box input')).toBeVisible()

    await page.goto('/about')
    await expect(page.locator('.search-box input')).toBeVisible()
  })

  test('header is sticky (stays on scroll)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(300)

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 1000))
    await page.waitForTimeout(200)

    // Header should still be visible
    await expect(page.locator('.app-header')).toBeVisible()
    await expect(page.locator('.app-header')).toBeInViewport()
  })
})

test.describe('SPA Routing', () => {
  test('direct URL to thread page works', async ({ page }) => {
    await page.goto('/thread/200203050051.g250pSL03381%40finney.org')
    await expect(page.locator('.thread-view')).toBeVisible()
  })

  test('direct URL to author page works', async ({ page }) => {
    await page.goto('/author/Hal%20Finney')
    await expect(page.locator('.profile-header')).toBeVisible()
  })

  test('direct URL to message page works', async ({ page }) => {
    await page.goto('/message/53155')
    await expect(page.getByText('Cold fusion redux')).toBeVisible()
  })

  test('direct URL to search works', async ({ page }) => {
    await page.goto('/search?q=singularity')
    await expect(page.locator('.section-header h2')).toContainText('singularity')
  })

  test('direct URL to glossary works', async ({ page }) => {
    await page.goto('/glossary')
    await expect(page.locator('.section-header h2')).toContainText('glossary')
  })

  test('direct URL to about works', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByText('The Extropians Mailing List')).toBeVisible()
  })

  test('browser back/forward works', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Authors' }).click()
    await expect(page).toHaveURL('/authors')

    await page.goBack()
    await expect(page).toHaveURL('/')

    await page.goForward()
    await expect(page).toHaveURL('/authors')
  })

  test('unknown routes show the SPA (not 404)', async ({ page }) => {
    const response = await page.goto('/some/nonexistent/route')
    expect(response!.status()).toBe(200)
  })
})
