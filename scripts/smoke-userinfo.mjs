/**
 * Smoke test: real call to the TikTok user info endpoint.
 * Requires TIKTOK_RAPIDAPI_KEY (uses .env via --env-file-if-exists).
 * Usage: npm run smoke:userinfo -- taylorswift
 */

const API_URL = 'https://tiktok-api23.p.rapidapi.com/api/user/info'

function fail(msg) {
  console.error(`SMOKE FAIL: ${msg}`)
  process.exit(1)
}

async function main() {
  const key = process.env.TIKTOK_RAPIDAPI_KEY
  if (!key) fail('TIKTOK_RAPIDAPI_KEY is not set')

  const uniqueId = process.argv[2] || 'taylorswift'
  const url = `${API_URL}?uniqueId=${encodeURIComponent(uniqueId)}`

  console.log(`GET ${url}`)
  const started = Date.now()
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': process.env.TIKTOK_RAPIDAPI_HOST || 'tiktok-api23.p.rapidapi.com',
    },
  })
  const ms = Date.now() - started

  if (!res.ok) fail(`HTTP ${res.status} ${res.statusText}`)
  const json = await res.json()
  console.log(`OK in ${ms}ms`)
  console.log(JSON.stringify(json, null, 2))
}

main().catch((err) => fail(err.message))