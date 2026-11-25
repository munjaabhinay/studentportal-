import test from 'node:test'
import assert from 'node:assert/strict'
import { databaseRateLimit } from './rate-limit.js'

process.env.RATE_LIMIT_SECRET = 'test-secret-value-that-is-at-least-32-characters'

test('database rate limit stores hashed identifiers and blocks requests over the limit', async () => {
  const storedKeys = []
  const counts = new Map()
  const pool = {
    async query(_sql, values) {
      const key = values[0]
      storedKeys.push(key)
      const hitCount = (counts.get(key) || 0) + 1
      counts.set(key, hitCount)
      return { rows: [{ hit_count: hitCount, window_started_at: new Date().toISOString() }] }
    },
  }
  const middleware = databaseRateLimit(pool, {
    scope: 'login',
    max: 2,
    windowSeconds: 900,
    includeEmail: true,
  })
  const req = { ip: '192.0.2.1', body: { email: 'person@example.com' } }
  let nextError = null

  await middleware(req, {}, (error) => { nextError = error || null })
  await middleware(req, {}, (error) => { nextError = error || null })
  await middleware(req, {}, (error) => { nextError = error || null })

  assert.equal(nextError?.status, 429)
  assert.equal(nextError?.code, 'rate_limit_exceeded')
  assert.equal(storedKeys.length, 5)
  assert.equal(storedKeys.some((key) => key.includes('192.0.2.1')), false)
  assert.equal(storedKeys.some((key) => key.includes('person@example.com')), false)
})
