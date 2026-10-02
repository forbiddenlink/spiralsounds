// CSRF defence for cookie-authenticated API calls. Browsers attach an Origin
// (or at least a Referer) header to cross-site POST/PUT/PATCH/DELETE requests,
// so a state-changing request whose Origin is another site is refused. Requests
// with neither header (curl, server-to-server, tests) carry no ambient browser
// cookies from a victim and are allowed. SameSite=lax cookies are the first line;
// this is the second.
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function requireSameOrigin(req, res, next) {
  if (!UNSAFE.has(req.method)) return next()

  const source = req.get('origin') || req.get('referer')
  if (!source) return next()

  let sourceHost
  try {
    sourceHost = new URL(source).host
  } catch {
    return res.status(403).json({ error: 'Cross-site request refused', code: 'CSRF_ORIGIN' })
  }

  const allowed = new Set([req.get('host')])
  if (process.env.CLIENT_URL) {
    try {
      allowed.add(new URL(process.env.CLIENT_URL).host)
    } catch {
      // ignore a malformed CLIENT_URL; the request host still applies
    }
  }

  if (!allowed.has(sourceHost)) {
    return res.status(403).json({ error: 'Cross-site request refused', code: 'CSRF_ORIGIN' })
  }
  next()
}
