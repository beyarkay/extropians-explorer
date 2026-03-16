import { test, expect } from '@playwright/test'

test.describe('Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('tag dropdown filters threads', async ({ page }) => {
    const select = page.locator('.filter-bar select')
    await select.selectOption('ai')
    await page.waitForTimeout(500)

    // Thread count header should mention "tagged"
    // Stats should update to show fewer messages
    const msgsText = await page.locator('.stat-card .value').first().textContent()
    const msgs = parseInt(msgsText!.replace(/,/g, ''))
    expect(msgs).toBeGreaterThan(0)
    expect(msgs).toBeLessThan(132000) // filtered, not all
  })

  test('tag filter updates timeline chart', async ({ page }) => {
    // Get initial chart data by checking stats
    const initialMsgs = await page.locator('.stat-card .value').first().textContent()

    await page.locator('.filter-bar select').selectOption('cryonics')
    await page.waitForTimeout(500)

    const filteredMsgs = await page.locator('.stat-card .value').first().textContent()
    expect(parseInt(filteredMsgs!.replace(/,/g, ''))).toBeLessThan(parseInt(initialMsgs!.replace(/,/g, '')))
  })

  test('participant filter with autocomplete', async ({ page }) => {
    const input = page.locator('.filter-bar input[placeholder="filter by participant..."]')
    await input.fill('Yudkow')
    await page.waitForTimeout(300)

    // Autocomplete dropdown should appear
    const suggestion = page.locator('text=Eliezer Yudkowsky').first()
    await expect(suggestion).toBeVisible()
    await suggestion.click()

    // Should show participant chip
    await expect(page.locator('.filter-bar').getByText('Eliezer Yudkowsky')).toBeVisible()

    // Threads should be filtered
    await page.waitForTimeout(500)
    const threadCount = await page.locator('.section-header h2').last().textContent()
    expect(threadCount).toBeTruthy()
  })

  test('multiple participant filters narrow results', async ({ page }) => {
    // Add first participant
    const input = page.locator('.filter-bar input[placeholder="filter by participant..."]')
    await input.fill('Yudkow')
    await page.waitForTimeout(300)
    await page.locator('text=Eliezer Yudkowsky').first().click()
    await page.waitForTimeout(500)

    const afterFirst = await page.locator('.section-header h2').last().textContent()
    const countAfterFirst = parseInt(afterFirst!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')

    // Add second participant
    await input.fill('Robin Han')
    await page.waitForTimeout(300)
    await page.locator('text=Robin Hanson').first().click()
    await page.waitForTimeout(500)

    const afterSecond = await page.locator('.section-header h2').last().textContent()
    const countAfterSecond = parseInt(afterSecond!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')

    // Adding a second participant should further narrow results
    expect(countAfterSecond).toBeLessThanOrEqual(countAfterFirst)
  })

  test('participant chip removal restores results', async ({ page }) => {
    const input = page.locator('.filter-bar input[placeholder="filter by participant..."]')
    await input.fill('Sandberg')
    await page.waitForTimeout(300)
    await page.locator('text=Anders Sandberg').first().click()
    await page.waitForTimeout(500)

    // Remove the chip
    await page.locator('.filter-bar').getByText('x').click()
    await page.waitForTimeout(500)

    // Should be back to unfiltered count
    const msgsText = await page.locator('.stat-card .value').first().textContent()
    expect(parseInt(msgsText!.replace(/,/g, ''))).toBeGreaterThan(100000)
  })

  test('tag + participant filters combine', async ({ page }) => {
    // Set tag filter
    await page.locator('.filter-bar select').selectOption('ai')
    await page.waitForTimeout(500)
    const afterTag = await page.locator('.section-header h2').last().textContent()
    const countTag = parseInt(afterTag!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')

    // Add participant
    const input = page.locator('.filter-bar input[placeholder="filter by participant..."]')
    await input.fill('Yudkow')
    await page.waitForTimeout(300)
    await page.locator('text=Eliezer Yudkowsky').first().click()
    await page.waitForTimeout(500)

    const afterBoth = await page.locator('.section-header h2').last().textContent()
    const countBoth = parseInt(afterBoth!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')

    expect(countBoth).toBeLessThanOrEqual(countTag)
    expect(countBoth).toBeGreaterThan(0)
  })

  test('tag from URL param is pre-selected', async ({ page }) => {
    await page.goto('/?tag=crypto')
    await page.waitForTimeout(500)

    const select = page.locator('.filter-bar select')
    await expect(select).toHaveValue('crypto')

    const msgsText = await page.locator('.stat-card .value').first().textContent()
    expect(parseInt(msgsText!.replace(/,/g, ''))).toBeLessThan(132000)
  })
})
