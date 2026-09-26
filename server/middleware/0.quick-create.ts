import { isSafeQuickCreateReturnPath, parseQuickCreateRoute } from '../utils/quick-create'

const QUICK_AUTH_PATH = '/dashboard/quick-auth'

function renderQuickCreatePage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Create short link</title>
  <style>
    :root { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #171717; background: #f7f7f8; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    main { width: min(560px, 100%); background: #fff; border: 1px solid #e5e5e5; border-radius: 16px; padding: 28px; box-shadow: 0 12px 40px rgba(0,0,0,.06); }
    h1 { margin: 0 0 12px; font-size: 24px; letter-spacing: -.02em; }
    p { margin: 0; color: #666; line-height: 1.6; }
    .result { margin-top: 20px; display: none; gap: 10px; }
    .result.visible { display: grid; }
    .short-link { width: 100%; padding: 12px 14px; border: 1px solid #ddd; border-radius: 10px; background: transparent; color: inherit; font: inherit; }
    button { justify-self: start; padding: 10px 14px; border: 0; border-radius: 10px; font: inherit; font-weight: 650; cursor: pointer; background: #171717; color: #fff; }
    @media (prefers-color-scheme: dark) {
      :root { color: #f5f5f5; background: #111; }
      main { background: #181818; border-color: #303030; box-shadow: none; }
      p { color: #aaa; }
      .short-link { border-color: #3a3a3a; }
      button { background: #f5f5f5; color: #111; }
    }
  </style>
  <script defer src="/quick-create.js"></script>
</head>
<body>
  <main>
    <h1>Create short link</h1>
    <p id="status">Creating the short link…</p>
    <div id="result" class="result">
      <input id="short-link" class="short-link" readonly aria-label="Short link">
      <button id="copy" type="button">Copy</button>
    </div>
  </main>
</body>
</html>`
}

export default eventHandler((event) => {
  const requestUrl = getRequestURL(event)

  if (event.method === 'GET' && requestUrl.pathname === QUICK_AUTH_PATH) {
    const returnTo = getQuery(event).return
    if (typeof returnTo !== 'string' || !isSafeQuickCreateReturnPath(returnTo)) {
      throw createError({
        status: 400,
        statusText: 'Invalid quick-create return path',
      })
    }

    return sendRedirect(event, returnTo, 302)
  }

  if (event.method !== 'GET' && event.method !== 'HEAD')
    return

  const quickCreate = parseQuickCreateRoute(requestUrl)
  if (!quickCreate)
    return

  const { reserveSlug, slugRegex } = useAppConfig()
  const normalizedSlug = quickCreate.slug.toLowerCase()
  if (!slugRegex.test(quickCreate.slug) || normalizedSlug === 'api' || reserveSlug.includes(normalizedSlug)) {
    throw createError({
      status: 400,
      statusText: 'Invalid or reserved short-link slug',
    })
  }

  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'X-Frame-Options', 'DENY')
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow, noarchive')
  setHeader(
    event,
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  )

  if (event.method === 'HEAD')
    return ''

  return renderQuickCreatePage()
})
