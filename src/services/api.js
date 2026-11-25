export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const headers = new Headers()
  if (body !== undefined) headers.set('Content-Type', 'application/json')

  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw { code: 'aborted', status: null, message: 'Request cancelled.' }
    }
    throw {
      code: 'api_unavailable',
      status: null,
      message: 'The portal server could not be reached. Try again shortly.',
    }
  }

  if (response.status === 204) return null

  let payload = null
  try {
    payload = await response.json()
  } catch {
    if (!response.ok) {
      throw {
        code: 'invalid_server_response',
        status: response.status,
        message: 'The server returned an invalid response.',
      }
    }
  }

  if (!response.ok) {
    throw {
      code: payload?.error?.code || 'request_failed',
      status: response.status,
      message: payload?.error?.message || 'The request could not be completed.',
    }
  }

  return payload
}
