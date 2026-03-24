import { test } from '@playwright/test'

test('FastMap vs Map comparison', async ({ page }) => {
  const consoleLogs: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleLogs.push(`[${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', err => {
    consoleLogs.push(`[PAGE ERROR] ${err.message}`)
  })

  // Screenshot original /map for comparison
  await page.goto('/map')
  await page.waitForTimeout(8000)
  await page.screenshot({ path: 'test-results/map-original.png', fullPage: false })

  // Screenshot /fastmap
  await page.goto('/fastmap')
  await page.waitForTimeout(8000)
  await page.screenshot({ path: 'test-results/fastmap-webgl.png', fullPage: false })

  // Check FPS counter
  const fpsText = await page.evaluate(() => {
    const divs = document.querySelectorAll('div')
    for (const d of divs) {
      const style = d.getAttribute('style') || ''
      if (style.includes('monospace') && style.includes('bottom')) {
        return d.textContent
      }
    }
    return 'NOT FOUND'
  })
  console.log('=== FPS COUNTER ===', fpsText)

  // Check canvas count and sizes
  const info = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas')
    return Array.from(canvases).map(c => ({
      width: c.width, height: c.height,
      engine: c.getAttribute('data-engine'),
    }))
  })
  console.log('=== CANVASES ===', JSON.stringify(info))

  if (consoleLogs.length > 0) {
    console.log('=== ERRORS ===')
    consoleLogs.forEach(l => console.log(l))
  }
})
