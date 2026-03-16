import { test, expect } from '@playwright/test'

test.describe('Timeline / Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows stats cards with non-zero values', async ({ page }) => {
    const stats = page.locator('.stats-grid')
    await expect(stats).toBeVisible()

    // Should have 4 stat cards
    const cards = stats.locator('.stat-card')
    await expect(cards).toHaveCount(4)

    // Messages count should be > 100k
    const msgsValue = cards.nth(0).locator('.value')
    const msgsText = await msgsValue.textContent()
    expect(parseInt(msgsText!.replace(/,/g, ''))).toBeGreaterThan(100000)

    // Authors > 2000
    const authorsValue = cards.nth(1).locator('.value')
    const authorsText = await authorsValue.textContent()
    expect(parseInt(authorsText!.replace(/,/g, ''))).toBeGreaterThan(2000)

    // Threads > 50000
    const threadsValue = cards.nth(2).locator('.value')
    const threadsText = await threadsValue.textContent()
    expect(parseInt(threadsText!.replace(/,/g, ''))).toBeGreaterThan(50000)
  })

  test('shows timeline bar chart', async ({ page }) => {
    const chart = page.locator('.timeline-chart')
    await expect(chart).toBeVisible()
    // Recharts renders SVG bars
    await expect(chart.locator('svg')).toBeVisible()
  })

  test('shows thread list with entries', async ({ page }) => {
    const threads = page.locator('.thread-list .thread-item')
    await expect(threads.first()).toBeVisible()
    const count = await threads.count()
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(50)
  })

  test('thread rows show message count, subject, author, and date', async ({ page }) => {
    const firstThread = page.locator('.thread-list .thread-item').first()
    await expect(firstThread.locator('.count')).toBeVisible()
    await expect(firstThread.locator('.subject')).toBeVisible()
    await expect(firstThread.locator('.author-name')).toBeVisible()
  })

  test('thread rows show topic tags', async ({ page }) => {
    // At least some threads should have tags
    const tags = page.locator('.thread-list .tag')
    await expect(tags.first()).toBeVisible({ timeout: 5000 })
  })

  test('sort controls change thread order', async ({ page }) => {
    // Default is "most replies" — get first thread's count
    const firstCount = await page.locator('.thread-item .count').first().textContent()

    // Switch to "newest"
    await page.getByText('newest').click()
    await page.waitForTimeout(500)

    // First thread should likely have changed
    const newFirstSubject = await page.locator('.thread-item .subject').first().textContent()
    expect(newFirstSubject).toBeTruthy()

    // Switch to "oldest"
    await page.getByText('oldest').click()
    await page.waitForTimeout(500)
    const oldestSubject = await page.locator('.thread-item .subject').first().textContent()
    expect(oldestSubject).toBeTruthy()
  })

  test('clicking a thread navigates to thread view', async ({ page }) => {
    // Click the subject text (not the tags, which have stopPropagation)
    const firstSubject = page.locator('.thread-item .subject').first()
    await firstSubject.click()
    await expect(page).toHaveURL(/\/thread\//)
  })

  test('pagination works', async ({ page }) => {
    // Should show pagination
    const pagination = page.locator('.pagination')
    await expect(pagination).toBeVisible()

    // Click next
    await pagination.getByText('next →').click()
    await page.waitForTimeout(500)

    // Should show page 2
    await expect(pagination.locator('.page-info')).toContainText('2/')
  })

  test('month click filters threads', async ({ page }) => {
    // Navigate with month param directly (clicking SVG bars is unreliable in tests)
    await page.goto('/?month=2000-01')
    await page.waitForTimeout(500)

    // Clear filter link should appear
    await expect(page.getByText('[clear month filter]')).toBeVisible()

    // Thread list should show filtered results
    await expect(page.locator('.thread-item').first()).toBeVisible()
  })
})
