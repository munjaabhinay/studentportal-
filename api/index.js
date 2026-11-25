import app from '../server/app.js'

export default function handler(req, res) {
  const incomingUrl = new URL(req.url, 'http://localhost')
  const routedPath = incomingUrl.searchParams.get('__api_path')

  if (routedPath) {
    incomingUrl.searchParams.delete('__api_path')
    req.url = `/api/${routedPath.replace(/^\/+/, '')}${incomingUrl.search}`
  }

  return app(req, res)
}
