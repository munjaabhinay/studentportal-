import 'dotenv/config'
import { randomBytes, createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'
import express from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import helmet from 'helmet'
import cors from 'cors'
import { pool as defaultPool } from './db.js'
import { databaseRateLimit } from './rate-limit.js'
import {
  asyncHandler,
  authError,
  isUuid,
  isValidEmail,
  normalizeEmail,
  publicUser,
  validateFullName,
  validatePassword,
} from './validation.js'

const isProduction = process.env.NODE_ENV === 'production'
const sessionSecret = process.env.SESSION_SECRET
const rateLimitSecret = process.env.RATE_LIMIT_SECRET || sessionSecret

if (!sessionSecret || sessionSecret.length < 32 || /replace|example|placeholder/i.test(sessionSecret)) {
  throw new Error('Set SESSION_SECRET to a private random value of at least 32 characters.')
}
if (!rateLimitSecret || rateLimitSecret.length < 32 || /replace|example|placeholder/i.test(rateLimitSecret)) {
  throw new Error('Set RATE_LIMIT_SECRET or use SESSION_SECRET as a private random value of at least 32 characters.')
}

const configuredOrigins = process.env.APP_ORIGINS
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (isProduction && (!configuredOrigins || configuredOrigins.length === 0)) {
  throw new Error('Set APP_ORIGINS to the exact production frontend origin(s).')
}

const allowedOrigins = new Set(
  configuredOrigins?.length
    ? configuredOrigins
    : ['http://localhost:5173', 'http://127.0.0.1:5173']
)
const PgSessionStore = connectPgSimple(session)
const userColumns = 'id, full_name, email, role, created_at'
const publicCookieName = isProduction ? '__Host-portal.sid' : 'portal.sid'
const dummyPasswordHash = bcrypt.hash(randomBytes(32).toString('hex'), 12)

function sendSession(sessionObject) {
  return new Promise((resolve, reject) => {
    sessionObject.save((error) => (error ? reject(error) : resolve()))
  })
}

function regenerateSession(sessionObject) {
  return new Promise((resolve, reject) => {
    sessionObject.regenerate((error) => (error ? reject(error) : resolve()))
  })
}

function destroySession(sessionObject) {
  return new Promise((resolve, reject) => {
    sessionObject.destroy((error) => (error ? reject(error) : resolve()))
  })
}

function requireOrigin(req, _res, next) {
  const origin = req.get('origin')
  if (!origin || !allowedOrigins.has(origin)) {
    return next(authError('origin_not_allowed', 'Request origin is not allowed.', 403))
  }
  next()
}

function requireUser(pool) {
  return asyncHandler(async (req, _res, next) => {
    const userId = req.session?.userId
    if (!userId) throw authError('not_authenticated', 'Sign in to continue.', 401)

    const { rows } = await pool.query(
      `SELECT ${userColumns} FROM public.users WHERE id = $1`,
      [userId]
    )
    if (!rows[0]) {
      await destroySession(req.session)
      throw authError('not_authenticated', 'Sign in to continue.', 401)
    }

    req.user = rows[0]
    next()
  })
}

function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(authError('admin_required', 'Administrator access is required.', 403))
  }
  next()
}

function validateCourse(input, { partial = false } = {}) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const fields = ['course_name', 'trainer_name', 'duration']
  const values = {}

  for (const field of fields) {
    if (partial && body[field] === undefined) continue
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > 160) {
      throw authError('invalid_course', `A valid ${field.replace('_', ' ')} is required.`, 400)
    }
    values[field] = body[field].trim()
  }

  if (!partial && fields.some((field) => values[field] === undefined)) {
    throw authError('invalid_course', 'Course name, trainer, and duration are required.', 400)
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.length > 5000) {
      throw authError('invalid_course', 'Description must be at most 5000 characters.', 400)
    }
    values.description = body.description.trim()
  } else if (!partial) {
    values.description = ''
  }

  return values
}

export function createPortalApp({ pool = defaultPool } = {}) {
  const app = express()
  const api = express.Router()
  const ensureUser = requireUser(pool)

  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, false)
      if (allowedOrigins.has(origin)) return callback(null, origin)
      return callback(authError('origin_not_allowed', 'Request origin is not allowed.', 403))
    },
  }))
  app.use(express.json({ limit: '16kb' }))
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  app.use('/api', (req, _res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return requireOrigin(req, _res, next)
    next()
  })
  app.use(session({
    name: publicCookieName,
    secret: sessionSecret,
    store: new PgSessionStore({
      pool,
      schemaName: 'public',
      tableName: 'portal_sessions',
      createTableIfMissing: false,
      pruneSessionInterval: 60,
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }))

  api.get('/health', (_req, res) => res.json({ status: 'ok' }))

  api.post('/register',
    databaseRateLimit(pool, { scope: 'register', max: 5, windowSeconds: 3600, includeEmail: true }),
    asyncHandler(async (req, res) => {
      const email = normalizeEmail(req.body?.email)
      const fullName = req.body?.full_name
      const password = req.body?.password

      if (!isValidEmail(email) || !validateFullName(fullName) || !validatePassword(password)) {
        throw authError(
          'invalid_registration',
          'Enter a valid name and email, and a password of at least 8 characters.',
          400
        )
      }

      const passwordHash = await bcrypt.hash(password, 12)
      const { rows } = await pool.query(
        `INSERT INTO public.users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'student')
         ON CONFLICT DO NOTHING
         RETURNING ${userColumns}`,
        [fullName.trim(), email, passwordHash]
      )

      if (!rows[0]) {
        throw authError(
          'registration_unavailable',
          'Unable to complete registration. If you already have an account, sign in; otherwise try again later.',
          400
        )
      }

      await regenerateSession(req.session)
      req.session.userId = rows[0].id
      await sendSession(req.session)
      res.status(201).json({ user: publicUser(rows[0]) })
    })
  )

  api.post('/login',
    databaseRateLimit(pool, { scope: 'login', max: 10, windowSeconds: 900, includeEmail: true }),
    asyncHandler(async (req, res) => {
      const email = normalizeEmail(req.body?.email)
      const password = req.body?.password
      if (!isValidEmail(email) || typeof password !== 'string' || password.length > 256) {
        throw authError('invalid_credentials', 'Email or password is incorrect.', 401)
      }

      const { rows } = await pool.query(
        `SELECT id, full_name, email, role, created_at, password_hash
         FROM public.users WHERE lower(email) = $1`,
        [email]
      )
      const row = rows[0]
      const passwordMatches = await bcrypt.compare(password, row?.password_hash || await dummyPasswordHash)

      if (!row || !row.password_hash || !passwordMatches) {
        throw authError('invalid_credentials', 'Email or password is incorrect.', 401)
      }

      await regenerateSession(req.session)
      req.session.userId = row.id
      await sendSession(req.session)
      res.json({ user: publicUser(row) })
    })
  )

  api.post('/logout', asyncHandler(async (req, res) => {
    if (req.session) await destroySession(req.session)
    res.clearCookie(publicCookieName, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    })
    res.status(204).end()
  }))

  api.get('/me', ensureUser, (req, res) => res.json({ user: publicUser(req.user) }))

  api.patch('/me', ensureUser, asyncHandler(async (req, res) => {
    if (!validateFullName(req.body?.full_name)) {
      throw authError('invalid_profile', 'Full name must be between 1 and 120 characters.', 400)
    }
    const { rows } = await pool.query(
      `UPDATE public.users
       SET full_name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${userColumns}`,
      [req.body.full_name.trim(), req.user.id]
    )
    res.json({ user: publicUser(rows[0]) })
  }))

  api.post('/activate',
    databaseRateLimit(pool, { scope: 'activate', max: 5, windowSeconds: 3600, includeEmail: true }),
    asyncHandler(async (req, res) => {
      const email = normalizeEmail(req.body?.email)
      const code = req.body?.activation_code
      const password = req.body?.password
      if (!isValidEmail(email) || typeof code !== 'string' || code.length < 32 || code.length > 200 ||
          !validatePassword(password)) {
        throw authError('activation_failed', 'The activation code or account details are invalid or expired.', 400)
      }

      const tokenHash = createHash('sha256').update(code).digest('hex')
      const client = await pool.connect()
      let activatedUser
      try {
        await client.query('BEGIN')
        const { rows } = await client.query(
          `SELECT u.id, u.full_name, u.email, u.role, u.created_at
           FROM public.portal_activation_tokens AS t
           JOIN public.users AS u ON u.id = t.user_id
           WHERE t.token_hash = $1
             AND lower(u.email) = $2
             AND t.expires_at > NOW()
           FOR UPDATE OF t, u`,
          [tokenHash, email]
        )
        if (!rows[0]) {
          await client.query('ROLLBACK')
          throw authError('activation_failed', 'The activation code or account details are invalid or expired.', 400)
        }

        const passwordHash = await bcrypt.hash(password, 12)
        await client.query(
          'UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [passwordHash, rows[0].id]
        )
        await client.query(
          `DELETE FROM public.portal_sessions WHERE sess->>'userId' = $1`,
          [rows[0].id]
        )
        await client.query('DELETE FROM public.portal_activation_tokens WHERE token_hash = $1', [tokenHash])
        await client.query('COMMIT')
        activatedUser = rows[0]
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        throw error
      } finally {
        client.release()
      }

      await regenerateSession(req.session)
      req.session.userId = activatedUser.id
      await sendSession(req.session)
      res.json({ user: publicUser(activatedUser) })
    })
  )

  api.get('/courses', asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, course_name, trainer_name, duration, description, created_at, updated_at
       FROM public.courses ORDER BY created_at DESC`
    )
    res.json({ courses: rows })
  }))

  api.get('/courses/:id', asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) throw authError('invalid_course_id', 'Course not found.', 404)
    const { rows } = await pool.query(
      `SELECT id, course_name, trainer_name, duration, description, created_at, updated_at
       FROM public.courses WHERE id = $1`,
      [req.params.id]
    )
    if (!rows[0]) throw authError('course_not_found', 'Course not found.', 404)
    res.json({ course: rows[0] })
  }))

  api.post('/courses', ensureUser, requireAdmin, asyncHandler(async (req, res) => {
    const course = validateCourse(req.body)
    const { rows } = await pool.query(
      `INSERT INTO public.courses (course_name, trainer_name, duration, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, course_name, trainer_name, duration, description, created_at, updated_at`,
      [course.course_name, course.trainer_name, course.duration, course.description]
    )
    res.status(201).json({ course: rows[0] })
  }))

  api.patch('/courses/:id', ensureUser, requireAdmin, asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) throw authError('invalid_course_id', 'Course not found.', 404)
    const values = validateCourse(req.body, { partial: true })
    const fields = Object.keys(values)
    if (fields.length === 0) throw authError('invalid_course', 'At least one course field is required.', 400)
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`)
    assignments.push('updated_at = NOW()')
    const { rows } = await pool.query(
      `UPDATE public.courses SET ${assignments.join(', ')}
       WHERE id = $${fields.length + 1}
       RETURNING id, course_name, trainer_name, duration, description, created_at, updated_at`,
      [...fields.map((field) => values[field]), req.params.id]
    )
    if (!rows[0]) throw authError('course_not_found', 'Course not found.', 404)
    res.json({ course: rows[0] })
  }))

  api.delete('/courses/:id', ensureUser, requireAdmin, asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) throw authError('invalid_course_id', 'Course not found.', 404)
    const result = await pool.query('DELETE FROM public.courses WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) throw authError('course_not_found', 'Course not found.', 404)
    res.status(204).end()
  }))

  api.get('/admin/stats', ensureUser, requireAdmin, asyncHandler(async (_req, res) => {
    const [{ rows: courses }, { rows: users }] = await Promise.all([
      pool.query('SELECT count(*)::int AS count FROM public.courses'),
      pool.query("SELECT count(*)::int AS count FROM public.users WHERE role = 'student'"),
    ])
    res.json({ courses: courses[0].count, students: users[0].count })
  }))

  api.get('/admin/users', ensureUser, requireAdmin, asyncHandler(async (req, res) => {
    const role = req.query.role
    if (role !== undefined && !['admin', 'student'].includes(role)) {
      throw authError('invalid_role', 'Role filter is invalid.', 400)
    }
    const limit = Number(req.query.limit ?? 50)
    const offset = Number(req.query.offset ?? 0)
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isInteger(offset) || offset < 0 || offset > 1_000_000) {
      throw authError('invalid_pagination', 'Pagination values are invalid.', 400)
    }
    const filters = role ? [role] : []
    const where = role ? 'WHERE role = $1' : ''
    const { rows } = await pool.query(
      `SELECT ${userColumns}, (password_hash IS NULL) AS needs_activation
       FROM public.users ${where}
       ORDER BY created_at DESC
       LIMIT $${filters.length + 1} OFFSET $${filters.length + 2}`,
      [...filters, limit, offset]
    )
    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS total FROM public.users ${where}`,
      filters
    )
    res.json({ users: rows, total: countRows[0].total, limit, offset })
  }))

  api.patch('/admin/users/:id', ensureUser, requireAdmin, asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) throw authError('invalid_user_id', 'User not found.', 404)
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const updates = {}
    if (body.full_name !== undefined) {
      if (!validateFullName(body.full_name)) {
        throw authError('invalid_user', 'Full name must be between 1 and 120 characters.', 400)
      }
      updates.full_name = body.full_name.trim()
    }
    if (body.role !== undefined) {
      if (!['admin', 'student'].includes(body.role)) {
        throw authError('invalid_role', 'Role must be admin or student.', 400)
      }
      updates.role = body.role
    }
    const fields = Object.keys(updates)
    if (fields.length === 0) throw authError('invalid_user', 'No supported user changes were provided.', 400)

    const client = await pool.connect()
    let updatedUser
    try {
      await client.query('BEGIN')
      await client.query("SELECT pg_advisory_xact_lock(hashtext('portal_admin_roles'))")
      const { rows: targetRows } = await client.query(
        `SELECT id, role FROM public.users WHERE id = $1 FOR UPDATE`,
        [req.params.id]
      )
      if (!targetRows[0]) throw authError('user_not_found', 'User not found.', 404)

      if (targetRows[0].role === 'admin' && updates.role === 'student') {
        const { rows: countRows } = await client.query(
          "SELECT count(*)::int AS count FROM public.users WHERE role = 'admin'"
        )
        if (countRows[0].count <= 1) {
          throw authError('last_admin', 'The last administrator cannot be demoted.', 409)
        }
      }

      const assignments = fields.map((field, index) => `${field} = $${index + 1}`)
      assignments.push('updated_at = NOW()')
      const { rows } = await client.query(
        `UPDATE public.users SET ${assignments.join(', ')}
         WHERE id = $${fields.length + 1}
         RETURNING ${userColumns}`,
        [...fields.map((field) => updates[field]), req.params.id]
      )
      updatedUser = rows[0]
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
    res.json({ user: publicUser(updatedUser) })
  }))

  api.post('/admin/users/:id/activation', ensureUser, requireAdmin, asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) throw authError('invalid_user_id', 'User not found.', 404)
    const { rows } = await pool.query(
      `SELECT id, full_name, email FROM public.users WHERE id = $1`,
      [req.params.id]
    )
    if (!rows[0]) throw authError('user_not_found', 'User not found.', 404)

    const code = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(code).digest('hex')
    await pool.query(
      `INSERT INTO public.portal_activation_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '48 hours')
       ON CONFLICT (user_id) DO UPDATE
       SET token_hash = EXCLUDED.token_hash,
           expires_at = EXCLUDED.expires_at,
           created_at = NOW()`,
      [tokenHash, rows[0].id]
    )
    res.status(201).json({
      activation_code: code,
      expires_in_hours: 48,
      user: { id: rows[0].id, full_name: rows[0].full_name, email: rows[0].email },
    })
  }))

  api.delete('/admin/users/:id', ensureUser, requireAdmin, asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) throw authError('invalid_user_id', 'User not found.', 404)
    if (req.params.id === req.user.id) {
      throw authError('cannot_delete_self', 'You cannot delete your own account.', 409)
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query("SELECT pg_advisory_xact_lock(hashtext('portal_admin_roles'))")
      const { rows } = await client.query(
        'SELECT id, role FROM public.users WHERE id = $1 FOR UPDATE',
        [req.params.id]
      )
      if (!rows[0]) throw authError('user_not_found', 'User not found.', 404)
      if (rows[0].role === 'admin') {
        const { rows: countRows } = await client.query(
          "SELECT count(*)::int AS count FROM public.users WHERE role = 'admin'"
        )
        if (countRows[0].count <= 1) {
          throw authError('last_admin', 'The last administrator cannot be deleted.', 409)
        }
      }
      await client.query(
        `DELETE FROM public.portal_sessions WHERE sess->>'userId' = $1`,
        [req.params.id]
      )
      await client.query('DELETE FROM public.users WHERE id = $1', [req.params.id])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
    res.status(204).end()
  }))

  app.use('/api', api)
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'not_found', message: 'API endpoint not found.' } }))
  app.use((error, _req, res, _next) => {
    if (error?.status >= 500 || !error?.status) {
      console.error('API request failed:', error?.message || 'Unknown error')
    }
    if (error?.status === 429 && error.retryAfter) {
      res.set('Retry-After', String(error.retryAfter))
    }
    const status = Number.isInteger(error?.status) ? error.status : 500
    const message = status >= 500 ? 'A server error occurred.' : error.message
    res.status(status).json({
      error: {
        code: error?.code || 'internal_error',
        message,
      },
    })
  })

  return app
}

const app = createPortalApp()
export default app
