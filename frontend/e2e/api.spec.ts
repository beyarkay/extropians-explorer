import { test, expect } from '@playwright/test'

test.describe('API Endpoints', () => {
  test('GET /api/stats returns valid stats', async ({ request }) => {
    const res = await request.get('/api/stats')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.total_messages).toBeGreaterThan(100000)
    expect(data.unique_authors).toBeGreaterThan(2000)
    expect(data.threads).toBeGreaterThan(50000)
    expect(data.date_range.start).toMatch(/^\d{4}-\d{2}$/)
    expect(data.date_range.end).toMatch(/^\d{4}-\d{2}$/)
  })

  test('GET /api/stats with tag filter returns fewer results', async ({ request }) => {
    const all = await (await request.get('/api/stats')).json()
    const filtered = await (await request.get('/api/stats?tag=cryonics')).json()
    expect(filtered.total_messages).toBeLessThan(all.total_messages)
    expect(filtered.total_messages).toBeGreaterThan(0)
  })

  test('GET /api/timeline returns monthly data', async ({ request }) => {
    const res = await request.get('/api/timeline')
    const data = await res.json()
    expect(data.length).toBeGreaterThan(50)
    expect(data[0]).toHaveProperty('month')
    expect(data[0]).toHaveProperty('count')
    expect(data[0].month).toMatch(/^\d{4}-\d{2}$/)
  })

  test('GET /api/tags returns tag list', async ({ request }) => {
    const res = await request.get('/api/tags')
    const data = await res.json()
    expect(data.length).toBeGreaterThan(10)
    const tagNames = data.map((t: any) => t.tag)
    expect(tagNames).toContain('ai')
    expect(tagNames).toContain('crypto')
    expect(tagNames).toContain('nanotech')
    expect(tagNames).toContain('cryonics')
  })

  test('GET /api/threads returns paginated threads', async ({ request }) => {
    const res = await request.get('/api/threads?page=1&per_page=10')
    const data = await res.json()
    expect(data.total).toBeGreaterThan(50000)
    expect(data.threads.length).toBe(10)
    expect(data.threads[0]).toHaveProperty('thread_id')
    expect(data.threads[0]).toHaveProperty('subject')
    expect(data.threads[0]).toHaveProperty('message_count')
    expect(data.threads[0]).toHaveProperty('tags')
  })

  test('GET /api/threads with sort options', async ({ request }) => {
    const byReplies = await (await request.get('/api/threads?sort=replies&per_page=5')).json()
    const byDate = await (await request.get('/api/threads?sort=date_desc&per_page=5')).json()

    // By replies: first thread should have many messages
    expect(byReplies.threads[0].message_count).toBeGreaterThan(50)

    // Different sort should give different first results (usually)
    expect(byReplies.threads[0].thread_id).not.toBe(byDate.threads[0].thread_id)
  })

  test('GET /api/threads with tag filter', async ({ request }) => {
    const all = await (await request.get('/api/threads?per_page=1')).json()
    const filtered = await (await request.get('/api/threads?tag=physics&per_page=1')).json()
    expect(filtered.total).toBeLessThan(all.total)
    expect(filtered.total).toBeGreaterThan(0)
  })

  test('GET /api/threads with participant filter', async ({ request }) => {
    const res = await request.get('/api/threads?participants=Eliezer+Yudkowsky&participants=Robin+Hanson&per_page=5')
    const data = await res.json()
    expect(data.total).toBeGreaterThan(0)
    // Each thread should have both participants
    for (const t of data.threads) {
      const parts = t.participants.join(',')
      expect(parts).toContain('Eliezer Yudkowsky')
      expect(parts).toContain('Robin Hanson')
    }
  })

  test('GET /api/thread/:id returns messages', async ({ request }) => {
    // First get a thread ID
    const threads = await (await request.get('/api/threads?per_page=1')).json()
    const threadId = threads.threads[0].thread_id
    const res = await request.get(`/api/thread/${encodeURIComponent(threadId)}`)
    const data = await res.json()
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('message_id')
    expect(data[0]).toHaveProperty('body')
    expect(data[0]).toHaveProperty('tags')
  })

  test('GET /api/message/:id returns message with nav links', async ({ request }) => {
    const res = await request.get('/api/message/53155')
    const data = await res.json()
    expect(data.subject).toBe('Cold fusion redux')
    expect(data.from_name).toBe('Hal Finney')
    expect(data).toHaveProperty('prev_id')
    expect(data).toHaveProperty('next_id')
    expect(data).toHaveProperty('prev_in_thread_id')
    expect(data).toHaveProperty('next_in_thread_id')
    expect(data).toHaveProperty('thread_id')
    expect(data).toHaveProperty('year_month')
  })

  test('GET /api/authors returns paginated author list', async ({ request }) => {
    const res = await request.get('/api/authors?page=1&per_page=10')
    const data = await res.json()
    expect(data.total).toBeGreaterThan(2000)
    expect(data.authors.length).toBe(10)
    // Should be sorted by post count desc
    expect(data.authors[0].post_count).toBeGreaterThanOrEqual(data.authors[1].post_count)
  })

  test('GET /api/authors/search autocomplete', async ({ request }) => {
    const res = await request.get('/api/authors/search?q=Yudkow')
    const data = await res.json()
    expect(data.length).toBeGreaterThan(0)
    expect(data[0].name).toContain('Yudkowsky')
    expect(data[0]).toHaveProperty('post_count')
  })

  test('GET /api/author/:name returns profile data', async ({ request }) => {
    const res = await request.get('/api/author/Hal%20Finney')
    const data = await res.json()
    expect(data.name).toBe('Hal Finney')
    expect(data.post_count).toBeGreaterThan(2000)
    expect(data.activity.length).toBeGreaterThan(10)
    expect(data.messages.length).toBeGreaterThan(0)
  })

  test('GET /api/search returns FTS results', async ({ request }) => {
    const res = await request.get('/api/search?q=nanotechnology&per_page=5')
    const data = await res.json()
    expect(data.total).toBeGreaterThan(0)
    expect(data.results.length).toBeGreaterThan(0)
    expect(data.results[0]).toHaveProperty('snippet')
    expect(data.results[0]).toHaveProperty('thread_id')
  })

  test('GET /api/search with short query returns error', async ({ request }) => {
    const res = await request.get('/api/search?q=a')
    expect(res.status()).toBe(422) // validation error
  })

  test('GET /api/messages returns individual messages', async ({ request }) => {
    const res = await request.get('/api/messages?month=2000-01&per_page=5')
    const data = await res.json()
    expect(data.total).toBeGreaterThan(0)
    expect(data.messages.length).toBeGreaterThan(0)
    expect(data.messages[0]).toHaveProperty('from_name')
    expect(data.messages[0]).toHaveProperty('subject')
  })
})
