import { test, expect } from '@playwright/test'

test.describe('Page Titles', () => {
  test('homepage has Timeline title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Timeline.*Extropians/)
  })

  test('authors page has Authors title', async ({ page }) => {
    await page.goto('/authors')
    await expect(page).toHaveTitle(/Authors.*Extropians/)
  })

  test('author profile has author name in title', async ({ page }) => {
    await page.goto('/author/Hal%20Finney')
    await expect(page).toHaveTitle(/Hal Finney.*Extropians/)
  })

  test('thread view has subject in title', async ({ page }) => {
    await page.goto('/thread/200203050051.g250pSL03381%40finney.org')
    await expect(page).toHaveTitle(/Cold fusion redux.*Extropians/)
  })

  test('message view has subject in title', async ({ page }) => {
    await page.goto('/message/53155')
    await expect(page).toHaveTitle(/Cold fusion redux.*Extropians/)
  })

  test('search page has query in title', async ({ page }) => {
    await page.goto('/search?q=nanotechnology')
    await expect(page).toHaveTitle(/Search.*nanotechnology.*Extropians/)
  })

  test('glossary page has Glossary title', async ({ page }) => {
    await page.goto('/glossary')
    await expect(page).toHaveTitle(/Glossary.*Extropians/)
  })

  test('about page has About title', async ({ page }) => {
    await page.goto('/about')
    await expect(page).toHaveTitle(/About.*Extropians/)
  })

  test('domains page has Links title', async ({ page }) => {
    await page.goto('/domains')
    await expect(page).toHaveTitle(/Links.*Extropians/)
  })

  test('domains page with domain has domain in title', async ({ page }) => {
    await page.goto('/domains?domain=www.wired.com')
    await expect(page).toHaveTitle(/www\.wired\.com.*Extropians/)
  })

  test('embeddings page has Embeddings title', async ({ page }) => {
    await page.goto('/embeddings')
    await expect(page).toHaveTitle(/Embeddings.*Extropians/)
  })

  test('title updates on navigation', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Timeline.*Extropians/)

    await page.getByRole('link', { name: 'Authors' }).click()
    await expect(page).toHaveTitle(/Authors.*Extropians/)

    await page.getByRole('link', { name: 'About' }).click()
    await expect(page).toHaveTitle(/About.*Extropians/)
  })
})
