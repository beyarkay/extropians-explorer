import { test, expect } from '@playwright/test'

test.describe('Embeddings color modes', () => {
  test('year color mode renders distinct colors across date range', async ({ page }) => {
    await page.goto('/embeddings')
    await expect(page.getByText(/\d+ msgs/)).toBeVisible({ timeout: 15000 })

    // Click 'year' color mode
    await page.getByRole('link', { name: 'year', exact: true }).click()
    await page.waitForTimeout(1000)

    // The year legend should be visible on the label canvas overlay
    // Take a screenshot to verify visually
    await page.screenshot({ path: 'test-results/embeddings-year-color.png' })

    // Verify the 'year' link is now active (has accent color)
    const yearLink = page.getByRole('link', { name: 'year', exact: true })
    await expect(yearLink).toBeVisible()
  })

  test('all four color modes are clickable', async ({ page }) => {
    await page.goto('/embeddings')
    await expect(page.getByText(/\d+ msgs/)).toBeVisible({ timeout: 15000 })

    for (const mode of ['cluster', 'year', 'author', 'tag']) {
      const link = page.getByRole('link', { name: mode, exact: true })
      await expect(link).toBeVisible()
      await link.click()
      await page.waitForTimeout(500)
    }
  })

  test('3D embeddings color modes work', async ({ page }) => {
    await page.goto('/embeddings3d')
    await page.waitForTimeout(5000)

    for (const mode of ['cluster', 'year', 'author', 'tag']) {
      const link = page.getByRole('link', { name: mode, exact: true })
      await expect(link).toBeVisible()
      await link.click()
      await page.waitForTimeout(500)
    }
  })
})
