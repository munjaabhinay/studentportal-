import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isUuid,
  isValidEmail,
  normalizeEmail,
  publicUser,
  validateFullName,
  validatePassword,
} from './validation.js'

test('normalizes email without accepting invalid email formats', () => {
  assert.equal(normalizeEmail('  User@Example.com '), 'user@example.com')
  assert.equal(isValidEmail('user@example.com'), true)
  assert.equal(isValidEmail('not-an-email'), false)
  assert.equal(isValidEmail(`${'a'.repeat(250)}@example.com`), false)
})

test('validates full names and bcrypt-compatible passwords', () => {
  assert.equal(validateFullName('  Student Name  '), true)
  assert.equal(validateFullName('   '), false)
  assert.equal(validateFullName('x'.repeat(121)), false)
  assert.equal(validatePassword('valid-password-123'), true)
  assert.equal(validatePassword('short'), false)
  assert.equal(validatePassword('😀'.repeat(19)), false)
})

test('validates UUID route identifiers', () => {
  assert.equal(isUuid('7f1a5d95-a8f3-4f90-bd7d-4632db9e2c11'), true)
  assert.equal(isUuid('not-a-uuid'), false)
})

test('public user serializer never exposes password hashes', () => {
  const result = publicUser({
    id: '7f1a5d95-a8f3-4f90-bd7d-4632db9e2c11',
    full_name: 'Student',
    email: 'student@example.com',
    role: 'student',
    created_at: '2026-01-01T00:00:00Z',
    password_hash: '$2b$12$secret-hash',
  })

  assert.deepEqual(Object.keys(result), ['id', 'full_name', 'email', 'role', 'created_at'])
  assert.equal('password_hash' in result, false)
})
