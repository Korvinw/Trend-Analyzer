/**
 * Smoke test: real call to the TikTok trending endpoint.
 * Requires TIKTOK_RAPIDAPI_KEY (uses .env via --env-file-if-exists).
 * Usage: npm run smoke:tiktok
 */

const API_URL = 'https://tiktok-api23.p.rapidapi.com/api/trending/video'

function fail(msg) {
  console.error(`SMOKE FAIL: ${msg}`)
  process.exit(1)
}

async function main() {
  const key = process.env.TIKTOK_RAPIDAPI_KEY
  if (!key) fail('TIKTOK_RAPIDAPI_KEY is not set')

  const url = new URL(API_URL)
  url.searchParams.set('page', '1')
  url.searchParams.set('limit', '20')
  url.searchParams.set('period', '30')
  url.searchParams.set('order_by', 'vv')
  url.searchParams.set('country', 'US')

  console.log(`GET ${url}`)
  const started = Date.now()
  const res = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': process.env.TIKTOK_RAPIDAPI_HOST || 'tiktok-api23.p.rapidapi.com',
    },
  })
  const ms = Date.now() - started

  if (!res.ok) fail(`HTTP ${res.status} ${res.statusText}`)
  const json = await res.json()
  const pagination = json?.data?.pagination
  const videos = json?.data?.videos
  if (!Array.isArray(videos)) fail('response has no data.videos array')

  console.log(`OK in ${ms}ms — ${videos.length} videos, has_more=${!!pagination?.has_more}`)
  const first = videos[0]
  if (first) {
    console.log('First video:')
    console.log(
      JSON.stringify(
        {
          id: first.id,
          title: first.title?.slice(0, 80),
          duration: first.duration,
          item_url: first.item_url,
          country_code: first.country_code,
        },
        null,
        2,
      ),
    )
  }
}

main().catch((err) => fail(err.message))