import 'dotenv/config'
import readline from 'node:readline'
import bcrypt from 'bcryptjs'
import { pool } from './db.js'
import { isValidEmail, normalizeEmail, validateFullName, validatePassword } from './validation.js'

function ask(question) {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => prompt.question(question, (answer) => {
    prompt.close()
    resolve(answer.trim())
  }))
}

function askSecret(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run this command from an interactive terminal so the password can be entered without echo.')
  }

  return new Promise((resolve, reject) => {
    const input = process.stdin
    let value = ''
    process.stdout.write(question)
    input.setRawMode(true)
    input.resume()
    input.setEncoding('utf8')

    const onData = (character) => {
      if (character === '\u0003') {
        input.removeListener('data', onData)
        input.setRawMode(false)
        process.stdout.write('\n')
        reject(new Error('Cancelled.'))
        return
      }
      if (character === '\r' || character === '\n') {
        input.removeListener('data', onData)
        input.setRawMode(false)
        process.stdout.write('\n')
        resolve(value)
        return
      }
      if (character === '\u007f' || character === '\b') {
        value = value.slice(0, -1)
        return
      }
      value += character
    }

    input.on('data', onData)
  })
}

async function main() {
  const email = normalizeEmail(await ask('Initial admin email: '))
  const fullName = await ask('Initial admin full name: ')
  const password = await askSecret('Initial admin password (input hidden): ')

  if (!isValidEmail(email)) throw new Error('Enter a valid email address.')
  if (!validateFullName(fullName)) throw new Error('Enter a name between 1 and 120 characters.')
  if (!validatePassword(password)) throw new Error('Password must be at least 8 characters and at most 72 UTF-8 bytes.')

  const passwordHash = await bcrypt.hash(password, 12)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('portal_initial_admin_bootstrap'))")
    const { rows: bootstrapRows } = await client.query(
      'SELECT completed_at FROM public.portal_bootstrap_state WHERE id = TRUE FOR UPDATE'
    )
    if (!bootstrapRows[0] || bootstrapRows[0].completed_at) {
      throw new Error('Initial administrator setup has already been completed.')
    }

    const { rows: existingUsers } = await client.query(
      'SELECT id FROM public.users WHERE lower(email) = $1 FOR UPDATE',
      [email]
    )

    if (existingUsers[0]) {
      await client.query(
        `UPDATE public.users
         SET full_name = $1, email = $2, password_hash = $3, role = 'admin', updated_at = NOW()
         WHERE id = $4`,
        [fullName.trim(), email, passwordHash, existingUsers[0].id]
      )
    } else {
      await client.query(
        `INSERT INTO public.users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'admin')`,
        [fullName.trim(), email, passwordHash]
      )
    }

    await client.query(
      'UPDATE public.portal_bootstrap_state SET completed_at = NOW() WHERE id = TRUE'
    )
    await client.query('COMMIT')
    console.log('Initial administrator configured. The one-time bootstrap is now locked.')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(async (error) => {
  console.error(error.message)
  await pool.end()
  process.exitCode = 1
})
