import { test, expect } from '@playwright/test'

test('Embeddings3D renders', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))

  await page.goto('/embeddings3d')
  await page.waitForTimeout(6000)

  await page.screenshot({ path: 'test-results/embeddings3d.png', fullPage: false })

  const canvasInfo = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas')
    return Array.from(canvases).map(c => ({
      width: c.width, height: c.height,
      engine: c.getAttribute('data-engine'),
    }))
  })
  console.log('=== CANVASES ===', JSON.stringify(canvasInfo))

  const fpsText = await page.evaluate(() => {
    const divs = document.querySelectorAll('div')
    for (const d of divs) {
      const s = d.getAttribute('style') || ''
      if (s.includes('monospace') && s.includes('bottom')) return d.textContent
    }
    return 'NOT FOUND'
  })
  console.log('=== FPS ===', fpsText)

  if (errors.length > 0) console.log('=== ERRORS ===', errors)

  expect(canvasInfo.length).toBeGreaterThan(0)
  expect(errors.length).toBe(0)
})
