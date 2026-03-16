import { test, expect } from '@playwright/test'

test.describe('Search', () => {
  test('search from header navigates to results', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('.search-box input')
    await searchInput.fill('nanotechnology')
    await searchInput.press('Enter')

    await expect(page).toHaveURL(/\/search\?q=nanotechnology/)
  })

  test('search results show count', async ({ page }) => {
    await page.goto('/search?q=nanotechnology')
    await page.waitForTimeout(500)

    const header = page.locator('.section-header h2')
    await expect(header).toContainText('nanotechnology')
    await expect(header).toContainText('results')

    // Should have some results
    const text = await header.textContent()
    const count = parseInt(text!.match(/(\d[\d,]*) results/)?.[1]?.replace(/,/g, '') || '0')
    expect(count).toBeGreaterThan(0)
  })

  test('search results show subject, author, date, and snippet', async ({ page }) => {
    await page.goto('/search?q=cryonics')
    await page.waitForTimeout(500)

    const firstResult = page.locator('.thread-item').first()
    await expect(firstResult.locator('.subject')).toBeVisible()
    await expect(firstResult.locator('.meta')).toBeVisible()
  })

  test('search results have highlighted snippets', async ({ page }) => {
    await page.goto('/search?q=cryonics')
    await page.waitForTimeout(500)

    // FTS5 wraps matches in <mark> tags
    const marks = page.locator('.snippet mark')
    await expect(marks.first()).toBeVisible()
  })

  test('clicking a search result navigates to thread', async ({ page }) => {
    await page.goto('/search?q=nanotechnology')
    await expect(page.locator('.thread-item').first()).toBeVisible()
    await page.locator('.thread-item .subject').first().click()
    await expect(page).toHaveURL(/\/thread\//)
  })

  test('search pagination works', async ({ page }) => {
    await page.goto('/search?q=intelligence')
    await page.waitForTimeout(500)

    const pagination = page.locator('.pagination')
    if (await pagination.isVisible()) {
      await pagination.getByText('next →').click()
      await page.waitForTimeout(500)
      await expect(pagination.locator('.page-info')).toContainText('2/')
    }
  })

  test('empty search shows no results gracefully', async ({ page }) => {
    await page.goto('/search?q=xyzzy12345nonexistent')
    await page.waitForTimeout(500)

    const header = page.locator('.section-header h2')
    await expect(header).toContainText('0 results')
  })

  test('search with special characters does not break', async ({ page }) => {
    await page.goto('/search?q=C%2B%2B')
    await page.waitForTimeout(500)

    // Should not crash
    await expect(page.locator('.section-header h2')).toBeVisible()
  })
})
