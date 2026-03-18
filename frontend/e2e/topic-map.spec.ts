import { test, expect } from '@playwright/test'

test.describe('Topic Map / Embeddings Page', () => {
  test('loads and shows point count', async ({ page }) => {
    await page.goto('/map')
    // Wait for first chunk to load
    await expect(page.getByText(/\d+ msgs/)).toBeVisible({ timeout: 10000 })
  })

  test('shows canvas element', async ({ page }) => {
    await page.goto('/map')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })
  })

  test('shows color mode toggles', async ({ page }) => {
    await page.goto('/map')
    await expect(page.getByRole('link', { name: 'cluster', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'year', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'author', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'tag', exact: true })).toBeVisible()
  })

  test('cluster filter dropdown has options', async ({ page }) => {
    await page.goto('/map')
    const select = page.locator('select:has(option:text("all clusters"))')
    await expect(select).toBeVisible()
    const options = await select.locator('option').count()
    expect(options).toBeGreaterThan(10) // 75 clusters + "all clusters"
  })

  test('tag filter dropdown has options', async ({ page }) => {
    await page.goto('/map')
    const select = page.locator('select:has(option:text("all tags"))')
    await expect(select).toBeVisible()
    const options = await select.locator('option').count()
    expect(options).toBeGreaterThan(10) // 13 tags + "all tags"
  })

  test('filtering by cluster shows fewer points', async ({ page }) => {
    await page.goto('/map')
    await expect(page.getByText(/\d+ msgs/)).toBeVisible({ timeout: 10000 })

    // Get initial count
    const initialText = await page.getByText(/\d+ msgs/).first().textContent()
    const initialCount = parseInt(initialText!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')

    // Select a cluster
    const select = page.locator('select:has(option:text("all clusters"))')
    await select.selectOption({ index: 1 }) // First actual cluster
    await page.waitForTimeout(500)

    const filteredText = await page.getByText(/\d+.*msgs/).first().textContent()
    const filteredCount = parseInt(filteredText!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')

    expect(filteredCount).toBeLessThan(initialCount)
    expect(filteredCount).toBeGreaterThan(0)
  })

  test('clear all removes filters', async ({ page }) => {
    await page.goto('/map')
    await expect(page.getByText(/\d+ msgs/)).toBeVisible({ timeout: 10000 })

    // Apply a filter
    const select = page.locator('select:has(option:text("all tags"))')
    await select.selectOption('ai')
    await page.waitForTimeout(500)

    // Clear all should appear
    await expect(page.getByText('clear all')).toBeVisible()
    await page.getByText('clear all').click()
    await page.waitForTimeout(500)

    // Should no longer show "clear all"
    await expect(page.getByText('clear all')).not.toBeVisible()
  })

  test('reset view link works', async ({ page }) => {
    await page.goto('/map')
    await expect(page.getByText('reset')).toBeVisible()
  })

  test('Embeddings nav link works', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Embeddings' }).click()
    await expect(page).toHaveURL('/map')
  })

  test('page refresh does not 404', async ({ page }) => {
    await page.goto('/map')
    await page.reload()
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Topic Map API', () => {
  test('GET /api/map/points returns chunked points', async ({ request }) => {
    const res = await request.get('/api/map/points?chunk=0')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.total).toBeGreaterThan(100000)
    expect(data.chunk).toBe(0)
    expect(data.points.length).toBeGreaterThan(0)
    expect(data.points.length).toBeLessThanOrEqual(5000)
    expect(data).toHaveProperty('has_more')

    // Check point structure
    const p = data.points[0]
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('x')
    expect(p).toHaveProperty('y')
    expect(p).toHaveProperty('c') // cluster_id
    expect(p).toHaveProperty('a') // author
    expect(p).toHaveProperty('s') // subject
    expect(p).toHaveProperty('m') // year_month
    expect(p).toHaveProperty('p') // preview
    expect(p).toHaveProperty('t') // tags
    expect(p).toHaveProperty('th') // thread_id
  })

  test('GET /api/map/clusters returns cluster metadata', async ({ request }) => {
    const res = await request.get('/api/map/clusters')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.length).toBe(75)

    const c = data[0]
    expect(c).toHaveProperty('id')
    expect(c).toHaveProperty('label')
    expect(c).toHaveProperty('count')
    expect(c).toHaveProperty('cx') // centroid x
    expect(c).toHaveProperty('cy') // centroid y
  })

  test('GET /api/clusters returns cluster list', async ({ request }) => {
    const res = await request.get('/api/clusters')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.length).toBe(75)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('label')
    expect(data[0]).toHaveProperty('count')
    // Should be sorted by count desc
    expect(data[0].count).toBeGreaterThanOrEqual(data[1].count)
  })

  test('GET /api/map/points chunk pagination works', async ({ request }) => {
    const chunk0 = await (await request.get('/api/map/points?chunk=0')).json()
    const chunk1 = await (await request.get('/api/map/points?chunk=1')).json()

    expect(chunk0.has_more).toBe(true)
    expect(chunk1.chunk).toBe(1)
    // Different points in each chunk
    expect(chunk0.points[0].id).not.toBe(chunk1.points[0].id)
  })
})
