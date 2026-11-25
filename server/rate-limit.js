import { createHmac } from 'node:crypto'
import { authError } from './validation.js'

const digest = (value) =>
  createHmac('sha256', process.env.RATE_LIMIT_SECRET || process.env.SESSION_SECRET)
    .update(value)
    .digest('hex')

export function databaseRateLimit(pool, { scope, max, windowSeconds, includeEmail = false }) {
  return async (req, _res, next) => {
    try {
      const identifiers = [`${scope}:ip:${req.ip || 'unknown'}`]
      if (includeEmail && typeof req.body?.email === 'string') {
        identifiers.push(`${scope}:email:${normalizeLimitedEmail(req.body.email)}`)
      }

      for (const identifier of identifiers) {
        const bucketKey = digest(identifier)
        const { rows } = await pool.query(
          `INSERT INTO public.portal_rate_limits
             (bucket_key, window_started_at, hit_count)
           VALUES ($1, NOW(), 1)
           ON CONFLICT (bucket_key) DO UPDATE
           SET
             hit_count = CASE
               WHEN portal_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 second')
                 THEN 1
               ELSE portal_rate_limits.hit_count + 1
             END,
             window_started_at = CASE
               WHEN portal_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 second')
                 THEN NOW()
               ELSE portal_rate_limits.window_started_at
             END
           RETURNING hit_count, window_started_at`,
          [bucketKey, windowSeconds]
        )

        if (rows[0].hit_count > max) {
          const error = authError(
            'rate_limit_exceeded',
            'Too many requests. Wait before trying again.',
            429
          )
          error.retryAfter = windowSeconds
          throw error
        }
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

const normalizeLimitedEmail = (email) =>
  email.trim().toLowerCase().slice(0, 254) || 'invalid'
