import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearTiktokCache, fetchTrendingVideos, fetchUserInfo, normalizeUserInfo, normalizeVideo } from '../lib/api/tiktok'
import { TiktokApiError, validateQuery } from '../lib/api/tiktok'

const sampleAweme = {
  id: '7647758735229635871',
  desc: 'Writing this song felt like a musical departure. #newmusic',
  createTime: 1780632608,
  stats: { playCount: 25300000, diggCount: 4000000, commentCount: 49100, shareCount: 193600, collectCount: 132200 },
  video: { cover: 'https://p19-common-sign.tiktokcdn.com/cover.jpg', duration: 25 },
  author: { uniqueId: 'taylorswift', nickname: 'Taylor Swift', avatarMedium: 'https://cdn/avatar.jpg', secUid: 'sec-1' },
}

const userInfoPayload = {
  statusCode: 0,
  shareMeta: { title: 'Taylor Swift on TikTok' },
  userInfo: {
    stats: { followerCount: 33400000, followingCount: 0, heart: 275500000, heartCount: 275500000, videoCount: 83 },
    user: {
      id: '6881290705605477381',
      uniqueId: 'taylorswift',
      nickname: 'Taylor Swift',
      signature: 'This is pretty much just a cat account',
      avatarMedium: 'https://cdn/avatar.jpg',
      secUid: 'MS4wLjABAAAAqB08cUbXaDWqbD6MCga2RbGTuhfO2EsHayBYx08NDrN7IE3jQuRDNNN6YwyfH6_6',
      verified: true,
    },
  },
}

function buildPostsResponse(itemList: unknown[] = [sampleAweme]) {
  return { data: { cursor: '1665126038000', hasMore: true, itemList } }
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
  it('maps an aweme item into the frontend shape', () => {
    const v = normalizeVideo(sampleAweme)!
    expect(v.id).toBe('7647758735229635871')
    expect(v.creator).toBe('taylorswift')
    expect(v.hook).toBe('Writing this song felt like a musical departure. #newmusic')
    expect(v.thumbnail).toBe(sampleAweme.video.cover)
    expect(v.sourceUrl).toBe('https://www.tiktok.com/@taylorswift/video/7647758735229635871')
    expect(v.duration).toBe(25)
    expect(v.views).toBe(25300000)
    expect(v.likes).toBe(4000000)
    expect(v.shares).toBe(193600)
  })

  it('keeps metrics null when the payload lacks them', () => {
    const v = normalizeVideo({ id: 'x', desc: '   ' })!
    expect(v.creator).toBeNull()
    expect(v.hook).toBe('')
    expect(v.duration).toBeNull()
    expect(v.views).toBeNull()
    expect(v.likes).toBeNull()
    expect(v.shares).toBeNull()
    expect(v.growth).toBeNull()
    expect(v.potentialScore).toBeNull()
    expect(v.trendLabel).toBeNull()
    expect(v.postedAgo).toBeNull()
  })

  it('returns null for items without an id', () => {
    expect(normalizeVideo({ desc: 'no id' })).toBeNull()
    expect(normalizeVideo('garbage')).toBeNull()
    expect(normalizeVideo(null)).toBeNull()
  })
})

describe('fetchTrendingVideos', () => {
  const baseQuery = { page: 1, limit: 20, period: 30, order_by: 'vv' as const, country: 'US' }

  it('fetches user info, then posts, and normalizes them', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/user/info')) {
        return new Response(JSON.stringify(userInfoPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/api/user/posts')) {
        return new Response(JSON.stringify(buildPostsResponse()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('{}', { status: 404 })
    }))

    const data = await fetchTrendingVideos(baseQuery)
    expect(data.videos).toHaveLength(2)
    expect(data.videos[0].creator).toBe('taylorswift')
    expect(data.videos[0].views).toBe(25300000)
    expect(data.pagination).toEqual({ page: 1, limit: 20, hasMore: false, totalCount: 2 })
    expect(data.requestedAt).toBeTruthy()
  })

  it('skips creators without a secUid and still returns other videos', async () => {
    let infoCalls = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/user/info')) {
        infoCalls += 1
        const payload = infoCalls === 1
          ? { userInfo: { user: { uniqueId: 'x', nickname: 'X' } } }
          : userInfoPayload
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/api/user/posts')) {
        return new Response(JSON.stringify(buildPostsResponse()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('{}', { status: 404 })
    }))

    const data = await fetchTrendingVideos(baseQuery)
    expect(data.videos).toHaveLength(1)
  })

  it('propagates RapidAPI errors from user info', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Bad request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    await expect(fetchTrendingVideos(baseQuery)).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Bad request',
    })
  })

  it('throws UPSTREAM when every feed source is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/user/info')) {
        return new Response(JSON.stringify(userInfoPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(buildPostsResponse([])), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    await expect(fetchTrendingVideos(baseQuery)).rejects.toMatchObject({ status: 502, code: 'UPSTREAM' })
  })

  it('throws on a non-JSON upstream response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200 })))

    await expect(fetchTrendingVideos(baseQuery)).rejects.toThrow(/non-JSON/)
  })
})

describe('normalizeUserInfo', () => {
  it('extracts fields from the documented userInfo shape', () => {
    const info = normalizeUserInfo(userInfoPayload, 'taylorswift')
    expect(info.id).toBe('6881290705605477381')
    expect(info.uniqueId).toBe('taylorswift')
    expect(info.nickname).toBe('Taylor Swift')
    expect(info.signature).toBe('This is pretty much just a cat account')
    expect(info.avatar).toBe('https://cdn/avatar.jpg')
    expect(info.secUid).toBe('MS4wLjABAAAAqB08cUbXaDWqbD6MCga2RbGTuhfO2EsHayBYx08NDrN7IE3jQuRDNNN6YwyfH6_6')
    expect(info.stats).toEqual({
      followers: 33400000,
      following: 0,
      videos: 83,
      hearts: 275500000,
    })
  })

  it('accepts the older data.user variant', () => {
    const json = {
      code: 0,
      data: {
        user: {
          id: '123456',
          unique_id: 'taylorswift',
          nickname: 'Taylor Swift',
          signature: 'Songwriter',
          avatarLarger: 'https://cdn/avatar.jpg',
          stats: { followerCount: 95000000, followingCount: 312, videoCount: 1200, heartCount: 1400000000 },
        },
      },
    }
    const info = normalizeUserInfo(json, 'taylorswift')
    expect(info.id).toBe('123456')
    expect(info.nickname).toBe('Taylor Swift')
    expect(info.stats.followers).toBe(95000000)
    expect(info.stats.hearts).toBe(1400000000)
  })

  it('never guesses missing fields — nulls instead', () => {
    const info = normalizeUserInfo({ data: {} }, 'some.user')
    expect(info.nickname).toBeNull()
    expect(info.signature).toBeNull()
    expect(info.secUid).toBeNull()
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
  it('normalizes the documented response shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify(userInfoPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    const info = await fetchUserInfo('taylorswift')
    expect(info.nickname).toBe('Taylor Swift')
    expect(info.stats.followers).toBe(33400000)
    expect(info.secUid).toBe('MS4wLjABAAAAqB08cUbXaDWqbD6MCga2RbGTuhfO2EsHayBYx08NDrN7IE3jQuRDNNN6YwyfH6_6')
  })

  it('propagates upstream errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 451 })))

    await expect(fetchUserInfo('taylorswift')).rejects.toMatchObject({ status: 451 })
  })

  it('throws on an empty (204) response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))

    await expect(fetchUserInfo('taylorswift')).rejects.toMatchObject({ status: 502 })
  })
})