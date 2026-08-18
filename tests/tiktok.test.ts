import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearTiktokCache, fetchUserInfo, normalizeUserInfo, normalizeVideo } from '../lib/api/tiktok'
import {
  TiktokApiError,
  fetchTrendingVideos,
  validateQuery,
} from '../lib/api/tiktok'
import type { RawTiktokVideo } from '../lib/api/types'

const sampleRaw: RawTiktokVideo = {
  country_code: 'US',
  cover: 'https://p16-sign-va.tiktokcdn.com/cover.jpg',
  duration: 159,
  id: '7572995879557139742',
  item_id: '7572995879557139742',
  item_url: 'https://www.tiktok.com/@mnm_pipi/video/7572995879557139742',
  region: 'United States',
  title: 'maybe the best day of my life 🥹💚🎄🐱 #angeltree #walmart gifting a support cat for Christmas with Angel Gift Tree',
}

const paginationWithLimit = {
  has_more: true,
  page: 1,
  limit: 20,
  total_count: 500,
}

const paginationWithSize = {
  has_more: true,
  page: 1,
  size: 20,
  total_count: 500,
}

function buildResponse(pagination: unknown, videos: unknown[] = [sampleRaw]) {
  return { code: 0, data: { pagination, videos }, msg: 'OK', request_id: 'req-1' }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  clearTiktokCache()
})

describe('validateQuery', () => {
  it('applies defaults', () => {
    const q = validateQuery(new URLSearchParams())
    expect(q).toEqual({ page: 1, limit: 20, period: 30, order_by: 'vv', country: 'US' })
  })

  it('accepts a full valid query', () => {
    const q = validateQuery(
      new URLSearchParams('page=2&limit=20&period=7&order_by=like&country=DE'),
    )
    expect(q).toEqual({ page: 2, limit: 20, period: 7, order_by: 'like', country: 'DE' })
  })

  it('rejects limit above 20 (the documented hard cap)', () => {
    expect(() => validateQuery(new URLSearchParams('limit=21'))).toThrow(TiktokApiError)
    expect(() => validateQuery(new URLSearchParams('limit=50'))).toThrow(TiktokApiError)
  })

  it('accepts limit exactly 20', () => {
    expect(validateQuery(new URLSearchParams('limit=20')).limit).toBe(20)
  })

  it('rejects bad period and order_by', () => {
    expect(() => validateQuery(new URLSearchParams('period=15'))).toThrow(TiktokApiError)
    expect(() => validateQuery(new URLSearchParams('order_by=bogus'))).toThrow(TiktokApiError)
  })

  it('rejects non-positive page', () => {
    expect(() => validateQuery(new URLSearchParams('page=0'))).toThrow(TiktokApiError)
  })
})

describe('normalizeVideo', () => {
  it('maps raw TikTok video into the frontend shape', () => {
    const v = normalizeVideo(sampleRaw)
    expect(v.id).toBe('7572995879557139742')
    expect(v.creator).toBe('mnm_pipi')
    expect(v.hook).toBe(sampleRaw.title)
    expect(v.thumbnail).toBe(sampleRaw.cover)
    expect(v.sourceUrl).toBe(sampleRaw.item_url)
    expect(v.duration).toBe(159)
    expect(v.countryCode).toBe('US')
    expect(v.region).toBe('United States')
    expect(v.length).toBe('60s+')
  })

  it('does not fabricate engagement metrics', () => {
    const v = normalizeVideo(sampleRaw)
    expect(v.views).toBeNull()
    expect(v.likes).toBeNull()
    expect(v.shares).toBeNull()
    expect(v.growth).toBeNull()
    expect(v.potentialScore).toBeNull()
    expect(v.trendLabel).toBeNull()
    expect(v.postedAgo).toBeNull()
  })

  it('handles missing optional fields', () => {
    const v = normalizeVideo({ id: 'x', title: '   ' })
    expect(v.creator).toBeNull()
    expect(v.hook).toBe('')
    expect(v.duration).toBeNull()
    expect(v.countryCode).toBeNull()
  })
})

describe('fetchTrendingVideos', () => {
  it('normalizes a standard response with limit-based pagination', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify(buildResponse(paginationWithLimit)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    const data = await fetchTrendingVideos({ page: 1, limit: 20, period: 30, order_by: 'vv', country: 'US' })
    expect(data.videos).toHaveLength(1)
    expect(data.videos[0].creator).toBe('mnm_pipi')
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      hasMore: true,
      totalCount: 500,
    })
    expect(data.requestedAt).toBeTruthy()
  })

  it('accepts the size-based pagination variant from the docs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify(buildResponse(paginationWithSize)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    const data = await fetchTrendingVideos({ page: 1, limit: 20, period: 30, order_by: 'vv', country: 'US' })
    expect(data.pagination.limit).toBe(20)
    expect(data.pagination.totalCount).toBe(500)
  })

  it('propagates RapidAPI errors with status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Bad request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    await expect(
      fetchTrendingVideos({ page: 1, limit: 20, period: 30, order_by: 'vv', country: 'US' }),
    ).rejects.toMatchObject({ status: 400, code: 'BAD_REQUEST', message: 'Bad request' })
  })

  it('propagates upstream 5xx errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('oops', { status: 502 })))

    await expect(
      fetchTrendingVideos({ page: 1, limit: 20, period: 30, order_by: 'vv', country: 'US' }),
    ).rejects.toMatchObject({ status: 502 })
  })

  it('throws on malformed response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify({ data: { videos: 'not-an-array' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    await expect(
      fetchTrendingVideos({ page: 1, limit: 20, period: 30, order_by: 'vv', country: 'US' }),
    ).rejects.toThrow(/Malformed TikTok response/)
  })

  it('throws on non-JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200 })))

    await expect(
      fetchTrendingVideos({ page: 1, limit: 20, period: 30, order_by: 'vv', country: 'US' }),
    ).rejects.toThrow(/non-JSON/)
  })
})

describe('normalizeUserInfo', () => {
  it('extracts creator fields from a typical nested payload', () => {
    const json = {
      code: 0,
      msg: 'OK',
      data: {
        user: {
          id: '123456',
          unique_id: 'taylorswift',
          nickname: 'Taylor Swift',
          signature: 'Songwriter',
          avatarLarger: 'https://cdn/avatar.jpg',
          stats: {
            followerCount: 95000000,
            followingCount: 312,
            videoCount: 1200,
            heartCount: 1400000000,
          },
        },
      },
    }
    const info = normalizeUserInfo(json, 'taylorswift')
    expect(info.id).toBe('123456')
    expect(info.uniqueId).toBe('taylorswift')
    expect(info.nickname).toBe('Taylor Swift')
    expect(info.signature).toBe('Songwriter')
    expect(info.avatar).toBe('https://cdn/avatar.jpg')
    expect(info.url).toBe('https://www.tiktok.com/@taylorswift')
    expect(info.stats).toEqual({
      followers: 95000000,
      following: 312,
      videos: 1200,
      hearts: 1400000000,
    })
  })

  it('accepts snake_case and top-level stats variants', () => {
    const json = {
      data: {
        unique_id: 'a.creator',
        follower_count: 1000,
        video_count: 5,
      },
    }
    const info = normalizeUserInfo(json, 'a.creator')
    expect(info.uniqueId).toBe('a.creator')
    expect(info.stats.followers).toBe(1000)
    expect(info.stats.videos).toBe(5)
  })

  it('never guesses missing fields — nulls instead', () => {
    const info = normalizeUserInfo({ data: {} }, 'some.user')
    expect(info.nickname).toBeNull()
    expect(info.signature).toBeNull()
    expect(info.stats).toEqual({ followers: null, following: null, videos: null, hearts: null })
    expect(info.url).toBe('https://www.tiktok.com/@some.user')
  })

  it('handles malformed payload', () => {
    const info = normalizeUserInfo('garbage', 'x')
    expect(info.id).toBeNull()
    expect(info.uniqueId).toBe('x')
    expect(info.stats.followers).toBeNull()
  })
})

describe('fetchUserInfo', () => {
  beforeEach(() => {
    clearTiktokCache()
  })

  it('normalizes a real response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: {
            user: { unique_id: 'taylorswift', nickname: 'Taylor', stats: { followerCount: 42 } },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }))

    const info = await fetchUserInfo('taylorswift')
    expect(info.nickname).toBe('Taylor')
    expect(info.stats.followers).toBe(42)
  })

  it('propagates upstream errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 451 })))

    await expect(fetchUserInfo('taylorswift')).rejects.toMatchObject({ status: 451 })
  })
})