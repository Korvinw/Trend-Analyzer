import { classifyCategory, classifyFormat, lengthBucketForDuration } from './classify'
import { isBadRequestPayload, videoQuerySchema, type ParsedVideoQuery } from './schemas'
import type { CreatorInfo, NormalizedVideo, RawTiktokItem, RawTiktokResponse, VideosData } from './types'

const DEFAULT_HOST = 'tiktok-api23.p.rapidapi.com'
const USER_INFO_PATH = '/api/user/info'
const USER_POSTS_PATH = '/api/user/posts'

/**
 * The provider's original `/api/trending/*` endpoints are deprecated
 * (they return `{"code":0,"data":null,"msg":"deprecated"}`), so the feed is
 * built from recent posts of a rotating pool of popular creators instead.
 */
const CREATOR_POOL = ['taylorswift', 'khaby.lame', 'addisonre', 'mrbeast', 'zachking', 'selenagomez']

/** Hard cap documented by the TikTok endpoint. */
export const MAX_LIMIT = 20

export class TiktokApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'TiktokApiError'
  }
}

export function isTiktokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_RAPIDAPI_KEY)
}

export function tiktokHost(): string {
  return process.env.TIKTOK_RAPIDAPI_HOST?.trim() || DEFAULT_HOST
}

/* -------------------------------------------------------------------------- */
/*  Small in-memory cache (per serverless instance, TTL 60s)                  */
/* -------------------------------------------------------------------------- */

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { at: number; data: VideosData }>()
const userInfoCache = new Map<string, { at: number; data: CreatorInfo }>()

function cacheKey(q: ParsedVideoQuery): string {
  return JSON.stringify(q)
}

/** Test helper — drop cached upstream data. */
export function clearTiktokCache(): void {
  cache.clear()
  userInfoCache.clear()
}

/* -------------------------------------------------------------------------- */
/*  Tolerant field extraction (upstream contract varies — never guess)        */
/* -------------------------------------------------------------------------- */

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function pickString(objs: (Record<string, unknown> | null)[], keys: string[]): string | null {
  for (const rec of objs) {
    if (!rec) continue
    for (const k of keys) {
      const v = rec[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return null
}

function pickNumber(objs: (Record<string, unknown> | null)[], keys: string[]): number | null {
  for (const rec of objs) {
    if (!rec) continue
    for (const k of keys) {
      const v = rec[k]
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
    }
  }
  return null
}

/** Walk nested key paths (e.g. ['userInfo', 'user']) and return the first
 * object found, or null. */
function nestedRecord(obj: unknown, paths: string[][]): Record<string, unknown> | null {
  const root = asRecord(obj)
  if (!root) return null
  for (const path of paths) {
    let cur: unknown = root
    let ok = true
    for (const key of path) {
      const rec = asRecord(cur)
      if (!rec || !(key in rec)) {
        ok = false
        break
      }
      cur = rec[key]
    }
    if (ok) {
      const found = asRecord(cur)
      if (found) return found
    }
  }
  return null
}

/* -------------------------------------------------------------------------- */
/*  Normalization                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Normalize one aweme item from `/api/user/posts` into the frontend shape.
 * Returns null for anything that has no usable id. Engagement metrics come
 * straight from the payload — nothing is fabricated.
 */
export function normalizeVideo(raw: unknown): NormalizedVideo | null {
  const item = asRecord(raw)
  if (!item) return null
  const id = pickString([item], ['id'])
  if (!id) return null

  const stats = asRecord(item.stats) ?? {}
  const video = asRecord(item.video) ?? {}
  const author = asRecord(item.author) ?? {}
  const uniqueId = pickString([author], ['uniqueId', 'unique_id'])

  const hook = (pickString([item], ['desc', 'title']) ?? '').trim()
  const duration = pickNumber([video], ['duration'])
  const cover =
    pickString([video], ['cover', 'originCover', 'dynamicCover']) ??
    pickString([author], ['avatarMedium', 'avatarLarger']) ??
    ''

  return {
    id,
    creator: uniqueId,
    postedAgo: null,
    category: classifyCategory(hook),
    format: classifyFormat(hook),
    length: lengthBucketForDuration(duration),
    thumbnail: cover,
    hook,
    views: pickNumber([stats], ['playCount', 'play_count', 'views']),
    likes: pickNumber([stats], ['diggCount', 'digg_count', 'likes']),
    shares: pickNumber([stats], ['shareCount', 'share_count', 'shares']),
    growth: null,
    trendLabel: null,
    potentialScore: null,
    sourceUrl: `https://www.tiktok.com/@${uniqueId ?? 'user'}/video/${id}`,
    duration,
    countryCode: null,
    region: null,
  }
}

/* -------------------------------------------------------------------------- */
/*  Fetching                                                                  */
/* -------------------------------------------------------------------------- */

async function tiktokRequest(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`https://${tiktokHost()}${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-key': process.env.TIKTOK_RAPIDAPI_KEY!,
      'x-rapidapi-host': tiktokHost(),
    },
    cache: 'no-store',
  })

  if (res.status === 204) return null

  if (!res.ok) {
    let message = `TikTok API responded with HTTP ${res.status}`
    try {
      const body = await res.json()
      if (isBadRequestPayload(body)) message = body.message
    } catch {
      // non-JSON body — keep default message
    }
    throw new TiktokApiError(res.status, res.status === 400 ? 'BAD_REQUEST' : 'UPSTREAM', message)
  }

  try {
    return await res.json()
  } catch {
    throw new TiktokApiError(502, 'UPSTREAM', 'TikTok API returned a non-JSON response')
  }
}

function parseUserPostsResponse(json: unknown): { itemList: unknown[]; hasMore: boolean; cursor?: string } {
  const root = asRecord(json)
  const data = asRecord(root?.data)
  const list = data?.itemList
  if (!Array.isArray(list)) {
    throw new TiktokApiError(502, 'UPSTREAM', 'TikTok API returned no post list')
  }
  return {
    itemList: list,
    hasMore: Boolean(data?.hasMore),
    cursor: typeof data?.cursor === 'string' ? data.cursor : undefined,
  }
}

export async function fetchTrendingVideos(query: ParsedVideoQuery): Promise<VideosData> {
  const key = cacheKey(query)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  // Rotate through the pool so the feed changes over time.
  const base = Math.floor(Date.now() / CACHE_TTL_MS)
  const creators = [CREATOR_POOL[base % CREATOR_POOL.length], CREATOR_POOL[(base + 1) % CREATOR_POOL.length]]

  const items: RawTiktokItem[] = []
  let lastError: Error | null = null

  for (const handle of creators) {
    try {
      const info = await fetchUserInfo(handle)
      if (!info.secUid) continue
      const json = await tiktokRequest(USER_POSTS_PATH, {
        secUid: info.secUid,
        count: String(Math.max(query.limit, 10)),
        cursor: '0',
      })
      if (json === null) continue
      const parsed = parseUserPostsResponse(json)
      const list = parsed.itemList as unknown[]
      items.push(...(list.filter((v) => normalizeVideo(v) !== null) as RawTiktokItem[]))
      if (items.length >= query.limit) break
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(`[tiktok] feed source ${handle} failed:`, lastError.message)
    }
  }

  const videos = items.map(normalizeVideo).filter((v): v is NormalizedVideo => v !== null)
  if (videos.length === 0) {
    throw lastError ?? new TiktokApiError(502, 'UPSTREAM', 'No videos returned from TikTok API')
  }

  const data: VideosData = {
    videos: videos.slice(0, query.limit),
    pagination: { page: query.page, limit: query.limit, hasMore: false, totalCount: videos.length },
    requestedAt: new Date().toISOString(),
  }

  cache.set(key, { at: Date.now(), data })
  return data
}

/* -------------------------------------------------------------------------- */
/*  Creator info (GET /api/user/info?uniqueId=...)                            */
/* -------------------------------------------------------------------------- */

/**
 * Tolerant extraction: the upstream user-info contract varies between
 * providers — never fail on unknown fields, never guess missing ones.
 */
export function normalizeUserInfo(json: unknown, uniqueId: string): CreatorInfo {
  const root = asRecord(json)
  if (!root) {
    return {
      id: null,
      uniqueId,
      nickname: null,
      signature: null,
      avatar: null,
      url: `https://www.tiktok.com/@${uniqueId}`,
      secUid: null,
      stats: { followers: null, following: null, videos: null, hearts: null },
    }
  }

  const user =
    nestedRecord(root, [['userInfo', 'user'], ['user'], ['data', 'user'], ['data', 'userInfo', 'user']]) ??
    asRecord(root.userInfo) ??
    null
  const stats =
    nestedRecord(user, [['stats'], ['statistics']]) ??
    nestedRecord(root, [['userInfo', 'stats'], ['data', 'user', 'stats'], ['data', 'userInfo', 'stats']]) ??
    asRecord(root.userInfo) ??
    null
  const objs = [user, root.userInfo, root].filter(Boolean) as unknown[]

  return {
    id: firstString(objs, ['id', 'userId', 'uid']),
    uniqueId: firstString(objs, ['uniqueId', 'unique_id', 'uniqueIdString']) ?? uniqueId,
    nickname: firstString(objs, ['nickname', 'name']),
    signature: firstString(objs, ['signature', 'desc', 'description', 'bio']),
    avatar: firstString(objs, ['avatarLarger', 'avatarMedium', 'avatar_thumb', 'avatarThumb', 'avatar']),
    url: `https://www.tiktok.com/@${uniqueId}`,
    secUid: firstString(objs, ['secUid', 'sec_uid']),
    stats: {
      followers: firstNumber([stats, user, root], ['followerCount', 'follower_count', 'followers', 'fans']),
      following: firstNumber([stats, user, root], ['followingCount', 'following_count', 'following']),
      videos: firstNumber([stats, user, root], ['videoCount', 'video_count', 'videos', 'works']),
      hearts: firstNumber([stats, user, root], ['heartCount', 'heart_count', 'hearts', 'likes']),
    },
  }
}

function firstString(objs: unknown[], keys: string[]): string | null {
  const recs = objs.map((o) => asRecord(o))
  return pickString(recs, keys)
}

function firstNumber(objs: unknown[], keys: string[]): number | null {
  const recs = objs.map((o) => asRecord(o))
  return pickNumber(recs, keys)
}

export async function fetchUserInfo(uniqueId: string): Promise<CreatorInfo> {
  const hit = userInfoCache.get(uniqueId)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  const json = await tiktokRequest(USER_INFO_PATH, { uniqueId })
  if (json === null) {
    throw new TiktokApiError(502, 'UPSTREAM', 'TikTok API returned empty user info')
  }
  const data = normalizeUserInfo(json, uniqueId)
  userInfoCache.set(uniqueId, { at: Date.now(), data })
  return data
}

export function validateQuery(params: URLSearchParams): ParsedVideoQuery {
  const raw: Record<string, unknown> = {}
  params.forEach((value, key) => {
    raw[key] = value
  })
  const parsed = videoQuerySchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    throw new TiktokApiError(400, 'VALIDATION', `Invalid query: ${issues.join('; ')}`)
  }
  return parsed.data
}