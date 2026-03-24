import { test, expect } from '@playwright/test'

test('FastMap WebGL debug', async ({ page }) => {
  const consoleLogs: string[] = []
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', err => {
    consoleLogs.push(`[PAGE ERROR] ${err.message}`)
  })

  // Navigate and wait a bit for everything to initialize
  await page.goto('/fastmap')
  await page.waitForTimeout(5000)

  // Screenshot immediately
  await page.screenshot({ path: 'test-results/fastmap-debug.png', fullPage: false })

  // Dump full page HTML structure (abbreviated)
  const bodyHTML = await page.evaluate(() => {
    const mainContent = document.querySelector('.main-content')
    return mainContent?.innerHTML?.substring(0, 3000) || 'NO .main-content FOUND'
  })
  console.log('=== MAIN CONTENT HTML ===')
  console.log(bodyHTML)

  // Count all canvases and check for WebGL
  const canvasInfo = await page.evaluate(() => {
    const allCanvases = document.querySelectorAll('canvas')
    return Array.from(allCanvases).map((c, i) => {
      // Can't get webgl context if Three.js already has it, so just check attributes
      return {
        index: i,
        width: c.width,
        height: c.height,
        cssWidth: c.offsetWidth,
        cssHeight: c.offsetHeight,
        style: c.getAttribute('style')?.substring(0, 150) || '',
        dataEngine: c.getAttribute('data-engine') || null,
        parentChildren: c.parentElement?.children.length || 0,
      }
    })
  })
  console.log('=== ALL CANVASES ===')
  console.log(JSON.stringify(canvasInfo, null, 2))

  // Check if any network requests failed
  console.log('=== BROWSER CONSOLE ===')
  for (const log of consoleLogs) {
    console.log(log)
  }

  // Verify something rendered
  expect(canvasInfo.length).toBeGreaterThan(0)
})
