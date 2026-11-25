export const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : ''

export const isValidEmail = (email) =>
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const validatePassword = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  Buffer.byteLength(password, 'utf8') <= 72

export const validateFullName = (name) =>
  typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 120

export const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export const publicUser = (user) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  role: user.role,
  created_at: user.created_at,
})

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

export const authError = (code, message, status) => {
  const error = new Error(message)
  error.code = code
  error.status = status
  return error
}
