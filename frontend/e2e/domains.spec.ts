import { test, expect } from '@playwright/test'

test.describe('Domains / Links Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/domains')
  })

  test('shows domain count in header', async ({ page }) => {
    const header = page.locator('.section-header h2').first()
    await expect(header).toBeVisible()
    const text = await header.textContent()
    expect(parseInt(text!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')).toBeGreaterThan(5000)
  })

  test('shows domain list sorted by link count', async ({ page }) => {
    const items = page.locator('.filter-bar').locator('..').locator('div > div')
    await expect(items.first()).toBeVisible()
  })

  test('domain search filters the list', async ({ page }) => {
    const input = page.locator('input[placeholder="search domains..."]')
    await input.fill('wikipedia')
    await page.waitForTimeout(500)

    const header = page.locator('.section-header h2').first()
    const text = await header.textContent()
    const count = parseInt(text!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(9000)
  })

  test('clicking a domain shows its URLs', async ({ page }) => {
    // Click the first domain in the list
    await page.locator('div[style*="cursor: pointer"]').first().click()
    await page.waitForTimeout(500)

    // Right panel should show URLs
    await expect(page.locator('.section-header h2').last()).toContainText('links from')

    // Should have URL entries
    const entries = page.locator('.thread-item')
    await expect(entries.first()).toBeVisible()
  })

  test('URL entries show author, subject, date, and snippet', async ({ page }) => {
    // Select a known domain
    await page.goto('/domains?domain=www.wired.com')
    await page.waitForTimeout(500)

    const entry = page.locator('.thread-item').first()
    await expect(entry).toBeVisible()

    // Should have author link
    const authorLink = entry.locator('a[href*="/author/"]')
    await expect(authorLink).toBeVisible()

    // Should have thread link
    const threadLink = entry.locator('a[href*="/thread/"]')
    await expect(threadLink).toBeVisible()

    // Should have snippet text
    const snippet = entry.locator('div[style*="font-family"]')
    await expect(snippet).toBeVisible()
    const text = await snippet.textContent()
    expect(text!.length).toBeGreaterThan(10)
  })

  test('clicking author name navigates to author profile', async ({ page }) => {
    await page.goto('/domains?domain=www.wired.com')
    await page.waitForTimeout(500)

    const authorLink = page.locator('.thread-item a[href*="/author/"]').first()
    const authorName = await authorLink.textContent()
    await authorLink.click()

    await expect(page).toHaveURL(/\/author\//)
    await expect(page.locator('.profile-header h2')).toContainText(authorName!)
  })

  test('clicking subject navigates to thread', async ({ page }) => {
    await page.goto('/domains?domain=www.wired.com')
    await page.waitForTimeout(500)

    const threadLink = page.locator('.thread-item a[href*="/thread/"]').first()
    await threadLink.click()

    await expect(page).toHaveURL(/\/thread\//)
    await expect(page.locator('.thread-view')).toBeVisible()
  })

  test('clicking entry body navigates to message', async ({ page }) => {
    await page.goto('/domains?domain=www.wired.com')
    await page.waitForTimeout(500)

    // Click the snippet area (not an inner link)
    const snippet = page.locator('.thread-item div[style*="font-family"]').first()
    await snippet.click()

    await expect(page).toHaveURL(/\/message\/\d+/)
  })

  test('pagination works for URL list', async ({ page }) => {
    // Pick a domain with many URLs
    await page.goto('/domains?domain=members.aol.com')
    await page.waitForTimeout(500)

    const pagination = page.locator('.pagination').last()
    if (await pagination.isVisible()) {
      await pagination.getByText('next →').click()
      await page.waitForTimeout(500)
      await expect(pagination.locator('.page-info')).toContainText('2/')
    }
  })

  test('domain pagination works', async ({ page }) => {
    const pagination = page.locator('.pagination').first()
    await expect(pagination).toBeVisible()

    await pagination.getByText('next →').click()
    await page.waitForTimeout(500)
    await expect(pagination.locator('.page-info')).toContainText('2/')
  })

  test('Links nav tab works', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Links' }).click()
    await expect(page).toHaveURL('/domains')
  })

  test('page refresh does not 404', async ({ page }) => {
    await page.goto('/domains?domain=www.wired.com')
    await page.reload()
    await expect(page.locator('.section-header h2').first()).toBeVisible()
  })
})

test.describe('Domains API', () => {
  test('GET /api/domains returns paginated domain list', async ({ request }) => {
    const res = await request.get('/api/domains?page=1&per_page=10')
    const data = await res.json()
    expect(data.total).toBeGreaterThan(5000)
    expect(data.domains.length).toBe(10)
    expect(data.domains[0]).toHaveProperty('domain')
    expect(data.domains[0]).toHaveProperty('url_count')
    expect(data.domains[0]).toHaveProperty('message_count')
    // Should be sorted by url_count desc
    expect(data.domains[0].url_count).toBeGreaterThanOrEqual(data.domains[1].url_count)
  })

  test('GET /api/domains with search', async ({ request }) => {
    const all = await (await request.get('/api/domains?per_page=1')).json()
    const filtered = await (await request.get('/api/domains?q=wikipedia&per_page=1')).json()
    expect(filtered.total).toBeLessThan(all.total)
    expect(filtered.total).toBeGreaterThan(0)
  })

  test('GET /api/domain/:domain returns URLs with snippets', async ({ request }) => {
    const res = await request.get('/api/domain/www.wired.com?per_page=5')
    const data = await res.json()
    expect(data.total).toBeGreaterThan(0)
    expect(data.urls.length).toBeGreaterThan(0)
    expect(data.urls[0]).toHaveProperty('url')
    expect(data.urls[0]).toHaveProperty('snippet')
    expect(data.urls[0]).toHaveProperty('message_id')
    expect(data.urls[0]).toHaveProperty('from_name')
    expect(data.urls[0]).toHaveProperty('subject')
    expect(data.urls[0]).toHaveProperty('thread_id')
    expect(data.urls[0].url).toContain('wired.com')
    expect(data.urls[0].snippet.length).toBeGreaterThan(10)
  })
})
