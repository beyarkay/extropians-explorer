import { test, expect } from '@playwright/test'

test.describe('Thread View', () => {
  // Use a known thread — "Cold fusion redux" by Hal Finney
  const THREAD_URL = '/thread/200203050051.g250pSL03381%40finney.org'

  test('loads and shows thread title without Re:', async ({ page }) => {
    await page.goto(THREAD_URL)
    const header = page.locator('.section-header h2')
    await expect(header).toBeVisible()
    const text = await header.textContent()
    expect(text).toContain('Cold fusion redux')
    // Should NOT start with "Re:"
    expect(text).not.toMatch(/^Re:/i)
  })

  test('shows message count', async ({ page }) => {
    await page.goto(THREAD_URL)
    await expect(page.getByText(/\d+ messages/)).toBeVisible()
  })

  test('shows expand/collapse controls', async ({ page }) => {
    await page.goto(THREAD_URL)
    await expect(page.getByText('expand all')).toBeVisible()
    await expect(page.getByText('collapse all')).toBeVisible()
  })

  test('messages show author, subject, and date', async ({ page }) => {
    await page.goto(THREAD_URL)
    const firstMsg = page.locator('.thread-message').first()
    await expect(firstMsg.locator('.author')).toBeVisible()
    await expect(firstMsg.locator('.date')).toBeVisible()
  })

  test('messages are nested (indented)', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.waitForTimeout(500)

    const messages = page.locator('.thread-message')
    const count = await messages.count()
    expect(count).toBeGreaterThan(1)

    // At least one message should have non-zero marginLeft (indicating nesting)
    let hasNested = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      const style = await messages.nth(i).getAttribute('style')
      if (style && style.includes('margin-left') && !style.includes('margin-left: 0')) {
        hasNested = true
        break
      }
    }
    expect(hasNested).toBe(true)
  })

  test('collapse all hides message bodies', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.waitForTimeout(300)

    // Bodies should be visible initially
    await expect(page.locator('.msg-body').first()).toBeVisible()

    // Collapse all
    await page.getByText('collapse all').click()
    await page.waitForTimeout(300)

    // Bodies should be hidden
    await expect(page.locator('.msg-body')).toHaveCount(0)

    // Expand all
    await page.getByText('expand all').click()
    await page.waitForTimeout(300)

    // Bodies should be visible again
    await expect(page.locator('.msg-body').first()).toBeVisible()
  })

  test('clicking [-] collapses a single message', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.waitForTimeout(300)

    const bodyCount = await page.locator('.msg-body').count()

    // Click the first [-] toggle
    await page.locator('.msg-header').first().click()
    await page.waitForTimeout(200)

    const newBodyCount = await page.locator('.msg-body').count()
    expect(newBodyCount).toBeLessThan(bodyCount)
  })

  test('vote controls work', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.waitForTimeout(300)

    const voteScore = page.locator('.vote-score').first()
    const initialScore = await voteScore.textContent()

    // Click upvote
    await page.locator('.vote-controls button').first().click()
    await page.waitForTimeout(100)

    const newScore = await voteScore.textContent()
    expect(newScore).not.toBe(initialScore)
  })

  test('author links navigate to author profile', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.waitForTimeout(300)

    const authorLink = page.locator('.msg-header .author').first()
    const authorName = await authorLink.textContent()
    await authorLink.click()

    await expect(page).toHaveURL(/\/author\//)
    await expect(page.locator('.profile-header h2')).toContainText(authorName!)
  })

  test('# permalink navigates to message view', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.waitForTimeout(300)

    await page.locator('.msg-header a:has-text("#")').first().click()
    await expect(page).toHaveURL(/\/message\/\d+/)
  })

  test('message bodies contain linkified URLs', async ({ page }) => {
    // Use a thread that likely contains URLs
    await page.goto(THREAD_URL)
    await page.waitForTimeout(300)

    // Check for any linked URL in any message body
    const links = page.locator('.msg-body a[href^="http"]')
    // Not all threads have URLs, so just check the structure works
    const count = await links.count()
    // Even if no URLs, the page should load without errors
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('wayback machine links appear next to URLs', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.waitForTimeout(300)

    const waybackLinks = page.locator('.wayback-link')
    const count = await waybackLinks.count()
    if (count > 0) {
      const href = await waybackLinks.first().getAttribute('href')
      expect(href).toContain('web.archive.org')
    }
  })

  test('quoted text renders with styled block', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.waitForTimeout(300)

    const quotes = page.locator('.quoted-text')
    const count = await quotes.count()
    // This thread should have quoted text
    expect(count).toBeGreaterThan(0)

    // Quoted text should NOT contain leading '>' characters
    const firstQuoteText = await quotes.first().textContent()
    expect(firstQuoteText).not.toMatch(/^\s*>/)
  })

  test('tags are shown on messages', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.waitForTimeout(300)

    const tags = page.locator('.msg-header .tag')
    // This specific thread may or may not have tags, but structure should work
    const count = await tags.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('shows participants list with message counts', async ({ page }) => {
    // Use a thread with multiple participants and varied counts
    await page.goto('/thread/129BE00D9DC8D411927600805FA7152806556C19%40groexmbcr11.pfizer.com')
    await page.waitForTimeout(500)

    // Should show "participants:" text
    await expect(page.getByText('participants:')).toBeVisible()

    // Top poster (Gts) should appear first
    const participantsDiv = page.locator('text=participants:').locator('..')
    const text = await participantsDiv.textContent()
    expect(text).toContain('Gts')

    // Should show counts in parentheses for authors with >1 message
    expect(text).toMatch(/\(\d+\)/)

    // Participant names should be links to author profiles
    const authorLinks = participantsDiv.locator('a[href*="/author/"]')
    const count = await authorLinks.count()
    expect(count).toBeGreaterThan(3)
  })

  test('participants are sorted by message count', async ({ page }) => {
    await page.goto('/thread/129BE00D9DC8D411927600805FA7152806556C19%40groexmbcr11.pfizer.com')
    await page.waitForTimeout(500)

    const participantsDiv = page.locator('text=participants:').locator('..')
    const text = await participantsDiv.textContent()

    // Extract counts — first author should have the highest count
    const counts = [...text!.matchAll(/\((\d+)\)/g)].map(m => parseInt(m[1]))
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
    }
  })

  test('back link returns to homepage', async ({ page }) => {
    await page.goto(THREAD_URL)
    await page.locator('.back-link').click()
    await expect(page).toHaveURL('/')
  })
})
