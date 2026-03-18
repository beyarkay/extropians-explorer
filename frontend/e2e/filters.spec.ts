import { test, expect } from '@playwright/test'

test.describe('Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // Helper: get the topic select (the one with "all topics" option)
  const topicSelect = (page: any) => page.locator('.filter-bar select:has(option[value="ai"])')

  test('tag dropdown filters threads', async ({ page }) => {
    await expect(page.locator('.stat-card .value').first()).toBeVisible()

    await topicSelect(page).selectOption('ai')
    await page.waitForTimeout(1000)

    const msgsText = await page.locator('.stat-card .value').first().textContent()
    const msgs = parseInt(msgsText!.replace(/,/g, ''))
    expect(msgs).toBeGreaterThan(0)
    expect(msgs).toBeLessThan(132000)
  })

  test('tag filter updates timeline chart', async ({ page }) => {
    const initialMsgs = await page.locator('.stat-card .value').first().textContent()

    await topicSelect(page).selectOption('cryonics')
    await page.waitForTimeout(1000)

    const filteredMsgs = await page.locator('.stat-card .value').first().textContent()
    expect(parseInt(filteredMsgs!.replace(/,/g, ''))).toBeLessThan(parseInt(initialMsgs!.replace(/,/g, '')))
  })

  test('participant filter with autocomplete', async ({ page }) => {
    const input = page.locator('.filter-bar input[placeholder="filter by participant..."]')
    await input.fill('Yudkow')
    await page.waitForTimeout(300)

    const suggestion = page.locator('text=Eliezer Yudkowsky').first()
    await expect(suggestion).toBeVisible()
    await suggestion.click()

    await expect(page.locator('.filter-bar').getByText('Eliezer Yudkowsky')).toBeVisible()

    await page.waitForTimeout(500)
    const threadCount = await page.locator('.section-header h2').last().textContent()
    expect(threadCount).toBeTruthy()
  })

  test('multiple participant filters narrow results', async ({ page }) => {
    const input = page.locator('.filter-bar input[placeholder="filter by participant..."]')
    await input.fill('Yudkow')
    await page.waitForTimeout(300)
    await page.locator('text=Eliezer Yudkowsky').first().click()
    await page.waitForTimeout(500)

    const afterFirst = await page.locator('.section-header h2').last().textContent()
    const countAfterFirst = parseInt(afterFirst!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')

    await input.fill('Robin Han')
    await page.waitForTimeout(300)
    await page.locator('text=Robin Hanson').first().click()
    await page.waitForTimeout(500)

    const afterSecond = await page.locator('.section-header h2').last().textContent()
    const countAfterSecond = parseInt(afterSecond!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')

    expect(countAfterSecond).toBeLessThanOrEqual(countAfterFirst)
  })

  test('participant chip removal restores results', async ({ page }) => {
    await expect(page.locator('.stat-card .value').first()).toBeVisible()

    const input = page.locator('.filter-bar input[placeholder="filter by participant..."]')
    await input.fill('Sandberg')
    await page.waitForTimeout(300)
    await page.locator('text=Anders Sandberg').first().click()
    await page.waitForTimeout(1000)

    await page.locator('.filter-bar span:has-text("Anders Sandberg") a').click()
    await page.waitForTimeout(1000)

    const msgsText = await page.locator('.stat-card .value').first().textContent()
    expect(parseInt(msgsText!.replace(/,/g, ''))).toBeGreaterThan(100000)
  })

  test('tag + participant filters combine', async ({ page }) => {
    await topicSelect(page).selectOption('ai')
    await page.waitForTimeout(1000)
    const afterTag = await page.locator('.section-header h2').last().textContent()
    const countTag = parseInt(afterTag!.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') || '0')

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
    await page.waitForTimeout(1000)

    const select = topicSelect(page)
    await expect(select).toHaveValue('crypto')

    const msgsText = await page.locator('.stat-card .value').first().textContent()
    expect(parseInt(msgsText!.replace(/,/g, ''))).toBeLessThan(132000)
  })
})
