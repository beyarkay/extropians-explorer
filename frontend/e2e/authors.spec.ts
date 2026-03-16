import { test, expect } from '@playwright/test'

test.describe('Authors Page', () => {
  test('shows ranked author list', async ({ page }) => {
    await page.goto('/authors')

    const header = page.locator('.section-header h2')
    await expect(header).toContainText('Authors')
    await expect(header).toContainText('2,')  // 2,000+

    const items = page.locator('.author-item')
    await expect(items.first()).toBeVisible()
    const count = await items.count()
    expect(count).toBeGreaterThan(50)
  })

  test('authors are sorted by post count', async ({ page }) => {
    await page.goto('/authors')
    await page.waitForTimeout(300)

    const counts = page.locator('.author-item .post-count')
    const first = parseInt((await counts.nth(0).textContent())!.replace(/,/g, ''))
    const second = parseInt((await counts.nth(1).textContent())!.replace(/,/g, ''))
    expect(first).toBeGreaterThanOrEqual(second)
  })

  test('shows rank numbers', async ({ page }) => {
    await page.goto('/authors')
    const firstRank = await page.locator('.author-item .rank').first().textContent()
    expect(firstRank!.trim()).toBe('1')
  })

  test('notable authors have Wikipedia links', async ({ page }) => {
    await page.goto('/authors')
    const wikiLinks = page.locator('.wiki-link')
    const count = await wikiLinks.count()
    expect(count).toBeGreaterThan(5) // We have ~20 notable authors
  })

  test('clicking an author navigates to their profile', async ({ page }) => {
    await page.goto('/authors')
    const firstAuthor = page.locator('.author-item').first()
    const name = await firstAuthor.locator('.name').textContent()
    await firstAuthor.click()

    await expect(page).toHaveURL(/\/author\//)
    await expect(page.locator('.profile-header h2')).toBeVisible()
  })

  test('pagination works', async ({ page }) => {
    await page.goto('/authors')
    const pagination = page.locator('.pagination')
    await expect(pagination).toBeVisible()

    await pagination.getByText('next →').click()
    await page.waitForTimeout(300)

    // Rank should start at 101
    const firstRank = await page.locator('.author-item .rank').first().textContent()
    expect(firstRank!.trim()).toBe('101')
  })
})

test.describe('Author Profile', () => {
  test('shows author header with post count and date range', async ({ page }) => {
    await page.goto('/author/Eliezer Yudkowsky')
    await page.waitForTimeout(300)

    await expect(page.locator('.profile-header h2')).toContainText('Eliezer Yudkowsky')
    await expect(page.locator('.profile-stats')).toContainText('posts')
  })

  test('shows Wikipedia link for notable authors', async ({ page }) => {
    await page.goto('/author/Hal Finney')
    await page.waitForTimeout(300)

    const wikiLink = page.locator('a:has-text("Wikipedia")')
    await expect(wikiLink).toBeVisible()
    const href = await wikiLink.getAttribute('href')
    expect(href).toContain('wikipedia.org')
  })

  test('shows activity chart', async ({ page }) => {
    await page.goto('/author/Anders Sandberg')
    await page.waitForTimeout(300)

    await expect(page.locator('.timeline-chart')).toBeVisible()
    await expect(page.locator('.timeline-chart svg')).toBeVisible()
  })

  test('shows thread list filtered to this author', async ({ page }) => {
    await page.goto('/author/Robin Hanson')
    await page.waitForTimeout(500)

    const threads = page.locator('.thread-item')
    await expect(threads.first()).toBeVisible()

    // Thread list should have sort controls
    await expect(page.getByText('most replies')).toBeVisible()
  })

  test('back link returns to authors list', async ({ page }) => {
    await page.goto('/author/Spike Jones')
    await page.locator('.back-link').click()
    await expect(page).toHaveURL('/authors')
  })

  test('page refresh does not 404', async ({ page }) => {
    await page.goto('/author/Hal Finney')
    await page.reload()
    await expect(page.locator('.profile-header h2')).toContainText('Hal Finney')
  })
})
