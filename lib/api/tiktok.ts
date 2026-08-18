import { classifyCategory, classifyFormat, lengthBucketForDuration } from './classify'
import { isBadRequestPayload, parseTiktokResponse, videoQuerySchema, type ParsedVideoQuery } from './schemas'
import type { CreatorInfo, NormalizedVideo, RawTiktokVideo, VideosData } from './types'

const DEFAULT_HOST = 'tiktok-api23.p.rapidapi.com'
const TRENDING_PATH = '/api/trending/video'
const USER_INFO_PATH = '/api/user/info'

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
/*  Normalization                                                             */
/* -------------------------------------------------------------------------- */

function parseCreator(itemUrl: string | undefined): string | null {
  if (!itemUrl) return null
  const m = itemUrl.match(/tiktok\.com\/@([^/?#]+)/i)
  return m ? m[1] : null
}

export function normalizeVideo(raw: RawTiktokVideo): NormalizedVideo {
  const title = raw.title ?? ''
  const hook = title.trim()
  return {
    id: raw.id,
    creator: parseCreator(raw.item_url),
    postedAgo: null,
    category: classifyCategory(hook),
    format: classifyFormat(hook),
    length: lengthBucketForDuration(raw.duration ?? null),
    thumbnail: raw.cover ?? '',
    hook,
    views: null,
    likes: null,
    shares: null,
    growth: null,
    trendLabel: null,
    potentialScore: null,
    sourceUrl: raw.item_url ?? '',
    duration: raw.duration ?? null,
    countryCode: raw.country_code ?? null,
    region: raw.region ?? null,
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

export async function fetchTrendingVideos(query: ParsedVideoQuery): Promise<VideosData> {
  const key = cacheKey(query)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  const json = await tiktokRequest(TRENDING_PATH, {
    page: String(query.page),
    limit: String(query.limit),
    period: String(query.period),
    order_by: query.order_by,
    country: query.country,
  })

  const parsed = parseTiktokResponse(json)
  const pagination = parsed.data.pagination

  const data: VideosData = {
    videos: parsed.data.videos.map(normalizeVideo),
    pagination: {
      page: pagination.page ?? query.page,
      limit: pagination.limit ?? pagination.size ?? query.limit,
      hasMore: pagination.has_more ?? false,
      totalCount: pagination.total_count ?? 0,
    },
    requestedAt: new Date().toISOString(),
  }

  cache.set(key, { at: Date.now(), data })
  return data
}

/* -------------------------------------------------------------------------- */
/*  Creator info (GET /api/user/info?uniqueId=...)                            */
/* -------------------------------------------------------------------------- */

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function firstString(objs: (unknown)[], keys: string[]): string | null {
  for (const o of objs) {
    const rec = asRecord(o)
    if (!rec) continue
    for (const k of keys) {
      const v = rec[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return null
}

function firstNumber(objs: unknown[], keys: string[]): number | null {
  for (const o of objs) {
    const rec = asRecord(o)
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

/** Tolerant extraction: the upstream user-info contract varies between
 * providers — never fail on unknown fields, never guess missing ones. */
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
      stats: { followers: null, following: null, videos: null, hearts: null },
    }
  }

  const data = asRecord(root.data)
  const user =
    nestedRecord(data, [['user'], ['userInfo', 'user']]) ??
    asRecord(root.user) ??
    null
  const stats =
    nestedRecord(user, [['stats'], ['statistics']]) ??
    asRecord(data?.stats) ??
    null
  const objs = [user, data, root].filter(Boolean) as unknown[]

  return {
    id: firstString(objs, ['id', 'userId', 'uid']),
    uniqueId: firstString(objs, ['uniqueId', 'unique_id', 'uniqueIdString']) ?? uniqueId,
    nickname: firstString(objs, ['nickname', 'name']),
    signature: firstString(objs, ['signature', 'desc', 'description', 'bio']),
    avatar: firstString(objs, ['avatarLarger', 'avatarMedium', 'avatar_thumb', 'avatarThumb', 'avatar']),
    url: `https://www.tiktok.com/@${uniqueId}`,
    stats: {
      followers: firstNumber([stats, user, data, root], ['followerCount', 'follower_count', 'followers', 'fans']),
      following: firstNumber([stats, user, data, root], ['followingCount', 'following_count', 'following']),
      videos: firstNumber([stats, user, data, root], ['videoCount', 'video_count', 'videos', 'works']),
      hearts: firstNumber([stats, user, data, root], ['heartCount', 'heart_count', 'hearts', 'likes']),
    },
  }
}

export async function fetchUserInfo(uniqueId: string): Promise<CreatorInfo> {
  const hit = userInfoCache.get(uniqueId)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  const json = await tiktokRequest(USER_INFO_PATH, { uniqueId })
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