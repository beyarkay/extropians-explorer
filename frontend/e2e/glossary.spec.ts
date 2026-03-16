import { test, expect } from '@playwright/test'

test.describe('Glossary Page', () => {
  test('shows glossary with terms', async ({ page }) => {
    await page.goto('/glossary')

    const header = page.locator('.section-header h2')
    await expect(header).toContainText('glossary')

    // Should show count of terms
    const text = await header.textContent()
    const count = parseInt(text!.match(/(\d+)/)?.[1] || '0')
    expect(count).toBeGreaterThan(50)
  })

  test('terms are sorted alphabetically', async ({ page }) => {
    await page.goto('/glossary')
    await page.waitForTimeout(300)

    const terms = page.locator('span[style*="font-weight: 600"]')
    const first = (await terms.nth(0).textContent())!.trim()
    const second = (await terms.nth(1).textContent())!.trim()
    // First term alphabetically should come before second
    expect(first.localeCompare(second)).toBeLessThanOrEqual(0)
  })

  test('search filters terms', async ({ page }) => {
    await page.goto('/glossary')
    await page.waitForTimeout(300)

    const allCount = await page.locator('.section-header h2').textContent()
    const totalTerms = parseInt(allCount!.match(/(\d+)/)?.[1] || '0')

    await page.locator('input[placeholder="search terms..."]').fill('cryonics')
    await page.waitForTimeout(200)

    const filteredCount = await page.locator('.section-header h2').textContent()
    const filteredTerms = parseInt(filteredCount!.match(/(\d+)/)?.[1] || '0')

    expect(filteredTerms).toBeLessThan(totalTerms)
    expect(filteredTerms).toBeGreaterThan(0)
  })

  test('category filter works', async ({ page }) => {
    await page.goto('/glossary')
    await page.waitForTimeout(300)

    await page.locator('.filter-bar select').selectOption('ai')
    await page.waitForTimeout(200)

    const filteredCount = await page.locator('.section-header h2').textContent()
    const terms = parseInt(filteredCount!.match(/(\d+)/)?.[1] || '0')
    expect(terms).toBeGreaterThan(0)
    expect(terms).toBeLessThan(60)
  })

  test('terms show definitions', async ({ page }) => {
    await page.goto('/glossary')
    await page.waitForTimeout(300)

    // Find "AGI" term
    await page.locator('input[placeholder="search terms..."]').fill('AGI')
    await page.waitForTimeout(200)

    await expect(page.getByText('Artificial General Intelligence')).toBeVisible()
  })

  test('category tags link to filtered timeline', async ({ page }) => {
    await page.goto('/glossary')
    await page.waitForTimeout(300)

    const tag = page.locator('.tag').first()
    const href = await tag.getAttribute('href')
    expect(href).toContain('/?tag=')
  })

  test('navigation from header works', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Glossary' }).click()
    await expect(page).toHaveURL('/glossary')
    await expect(page.locator('.section-header h2')).toContainText('glossary')
  })
})
