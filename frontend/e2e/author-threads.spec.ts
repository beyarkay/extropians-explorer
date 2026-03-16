import { test, expect } from '@playwright/test'

test.describe('Author page thread relevance', () => {
  test('threads shown on author page have that author as a participant', async ({ request }) => {
    // Get threads for Hal Finney via API
    const res = await request.get('/api/threads?author=Hal+Finney&sort=date_desc&per_page=20')
    const data = await res.json()

    for (const thread of data.threads) {
      // Every thread listed should have Hal Finney in participants
      const participants = thread.participants.join(',')
      expect(participants).toContain('Hal Finney')
    }
  })

  test('clicking a thread from author page shows that author in the thread', async ({ page }) => {
    await page.goto('/author/Hal%20Finney')
    await expect(page.locator('.thread-item').first()).toBeVisible()

    // Get the subject of the first thread
    const subject = await page.locator('.thread-item .subject').first().textContent()

    // Click it
    await page.locator('.thread-item .subject').first().click()
    await expect(page).toHaveURL(/\/thread\//)

    // Hal Finney should appear as an author of at least one message
    await expect(page.locator('.thread-message')).not.toHaveCount(0)
    const authors = await page.locator('.msg-header .author').allTextContents()
    expect(authors).toContain('Hal Finney')
  })

  test('thread subject shown on author page matches thread view title', async ({ page }) => {
    await page.goto('/author/Hal%20Finney')
    await expect(page.locator('.thread-item').first()).toBeVisible()

    // Get subject from thread list
    const listSubject = await page.locator('.thread-item .subject').first().textContent()

    // Click through
    await page.locator('.thread-item .subject').first().click()
    await expect(page).toHaveURL(/\/thread\//)

    // Wait for thread view to render (it has .thread-view with messages)
    await expect(page.locator('.thread-view')).toBeVisible()

    // The thread title is the section-header h2 that does NOT contain "threads"
    const headers = await page.locator('.section-header h2').allTextContents()
    const threadTitle = headers.find(h => !h.includes('threads'))
    expect(threadTitle).toBeTruthy()

    // They should be related (one might have Re: stripped)
    const normalise = (s: string) => s!.replace(/^Re:\s*/i, '').trim().toLowerCase()
    expect(normalise(threadTitle!)).toBe(normalise(listSubject!))
  })
})
