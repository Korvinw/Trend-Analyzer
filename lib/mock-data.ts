import type {
  Category,
  TrendVideo,
  VideoAnalysis,
  VideoFormat,
} from './types'

export const CATEGORIES: Category[] = [
  'Fashion',
  'Food',
  'Fitness',
  'Beauty',
  'Tech',
  'DIY',
  'Travel',
  'Pets',
  'Other',
]

export const FORMATS: VideoFormat[] = [
  'Talking head',
  'Tutorial',
  'Story',
  'List',
  'Meme',
]

const thumb = (name: string) => `/thumbnails/${name}.png`

export const VIDEOS: TrendVideo[] = [
  {
    id: 'v1',
    creator: 'mila.styles',
    postedAgo: '2ч',
    category: 'Fashion',
    format: 'Story',
    length: '15–30s',
    thumbnail: thumb('fashion'),
    hook: 'Один базовый гардероб — пять образов на неделю',
    views: 1_240_000,
    likes: 198_000,
    shares: 41_200,
    growth: 92,
    trendLabel: 'rising-fast',
    potentialScore: 82,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v2',
    creator: 'kitchen.pavel',
    postedAgo: '5ч',
    category: 'Food',
    format: 'Tutorial',
    length: '30–60s',
    thumbnail: thumb('food'),
    hook: 'Паста за 8 минут без сливок, но кремовая',
    views: 840_000,
    likes: 121_000,
    shares: 18_400,
    growth: 74,
    trendLabel: 'steady',
    potentialScore: 71,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v3',
    creator: 'move.with.dana',
    postedAgo: '1ч',
    category: 'Fitness',
    format: 'List',
    length: '<15s',
    thumbnail: thumb('fitness'),
    hook: '3 движения для спины, если весь день за столом',
    views: 420_000,
    likes: 63_500,
    shares: 22_900,
    growth: 88,
    trendLabel: 'rising-fast',
    potentialScore: 77,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v4',
    creator: 'glow.by.ira',
    postedAgo: '3ч',
    category: 'Beauty',
    format: 'Tutorial',
    length: '30–60s',
    thumbnail: thumb('beauty'),
    hook: 'Дневной макияж за 90 секунд для гипоопытных',
    views: 660_000,
    likes: 88_000,
    shares: 9_100,
    growth: 61,
    trendLabel: 'steady',
    potentialScore: 64,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v5',
    creator: 'unbox.max',
    postedAgo: '6ч',
    category: 'Tech',
    format: 'Talking head',
    length: '60s+',
    thumbnail: thumb('tech'),
    hook: 'Гаджет за 15$, который реально экономит время',
    views: 305_000,
    likes: 33_400,
    shares: 4_200,
    growth: 43,
    trendLabel: null,
    potentialScore: 52,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v6',
    creator: 'room.reset',
    postedAgo: '4ч',
    category: 'DIY',
    format: 'Story',
    length: '30–60s',
    thumbnail: thumb('diy'),
    hook: 'Угол в спальне до и после за один вечер',
    views: 512_000,
    likes: 74_000,
    shares: 15_800,
    growth: 69,
    trendLabel: 'steady',
    potentialScore: 68,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v7',
    creator: 'walk.with.leo',
    postedAgo: '2ч',
    category: 'Travel',
    format: 'Story',
    length: '15–30s',
    thumbnail: thumb('travel'),
    hook: 'Что попробовать на ночном рынке за 5$',
    views: 928_000,
    likes: 140_000,
    shares: 27_600,
    growth: 81,
    trendLabel: 'peaking',
    potentialScore: 74,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v8',
    creator: 'goodboy.diaries',
    postedAgo: '30м',
    category: 'Pets',
    format: 'Meme',
    length: '<15s',
    thumbnail: thumb('pets'),
    hook: 'Реакция щенка на первый снег — на 8 секунде',
    views: 1_680_000,
    likes: 312_000,
    shares: 96_400,
    growth: 96,
    trendLabel: 'rising-fast',
    potentialScore: 88,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v9',
    creator: 'daily.fit',
    postedAgo: '7ч',
    category: 'Fitness',
    format: 'Tutorial',
    length: '15–30s',
    thumbnail: thumb('fitness'),
    hook: 'Разминка на 30 секунд перед выходом из дома',
    views: 214_000,
    likes: 26_100,
    shares: 3_050,
    growth: 38,
    trendLabel: null,
    potentialScore: 49,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v10',
    creator: 'seasonal.eats',
    postedAgo: '9ч',
    category: 'Food',
    format: 'List',
    length: '<15s',
    thumbnail: thumb('food'),
    hook: '5 завтраков, которые готовятся быстрее кофе',
    views: 733_000,
    likes: 101_000,
    shares: 19_700,
    growth: 66,
    trendLabel: 'steady',
    potentialScore: 70,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v11',
    creator: 'style.notes',
    postedAgo: '11ч',
    category: 'Fashion',
    format: 'Talking head',
    length: '60s+',
    thumbnail: thumb('fashion'),
    hook: 'Как проверить качество ткани прямо в магазине',
    views: 188_000,
    likes: 19_400,
    shares: 2_100,
    growth: 29,
    trendLabel: null,
    potentialScore: 44,
    sourceUrl: 'https://www.tiktok.com',
  },
  {
    id: 'v12',
    creator: 'fix.it.yourself',
    postedAgo: '5ч',
    category: 'DIY',
    format: 'Tutorial',
    length: '30–60s',
    thumbnail: thumb('diy'),
    hook: 'Скрипучая дверь: чиним за 20 секунд без инструментов',
    views: 456_000,
    likes: 58_900,
    shares: 12_300,
    growth: 64,
    trendLabel: 'steady',
    potentialScore: 66,
    sourceUrl: 'https://www.tiktok.com',
  },
]

/** How fresh the feed is, shown in the intro zone. */
export const FEED_UPDATED_AGO = '12 мин'

/* -------------------------------------------------------------------------- */
/*  Analysis generator — deterministic per video (mock of a future backend)   */
/* -------------------------------------------------------------------------- */

function tierFor(score: number): VideoAnalysis['tier'] {
  if (score >= 75) return 'high'
  if (score >= 55) return 'medium'
  return 'low'
}

function verdictFor(tier: VideoAnalysis['tier']): string {
  switch (tier) {
    case 'high':
      return 'Стоит разобрать'
    case 'medium':
      return 'Можно протестировать'
    case 'low':
      return 'Слабая база для повторения'
  }
}

const formatFitText: Record<VideoFormat, string> = {
  'Talking head': 'Требует сильной подачи ведущего; удерживать внимание сложнее.',
  Tutorial: 'Хороший fit для коротких вертикальных роликов с понятным результатом.',
  Story: 'Формат истории хорошо держит досматриваемость до payoff.',
  List: 'Списочный формат читается быстро и повышает сохранения.',
  Meme: 'Мемовая механика легко расшаривается, но быстро выгорает.',
}

export function analyzeVideo(video: TrendVideo): VideoAnalysis {
  const score = video.potentialScore ?? 0
  const tier = tierFor(score)
  const highEngagement = (video.shares ?? 0) / (video.views ?? 1) > 0.02

  const factors: VideoAnalysis['factors'] = [
    {
      key: 'hook',
      label: 'Сила хука',
      strength: score >= 75 ? 'strong' : score >= 55 ? 'above-average' : 'average',
      explanation:
        score >= 75
          ? 'Сильный: обещание результата в первые 1–2 секунды.'
          : 'Средний: суть проявляется не сразу, зрителю нужно подождать.',
    },
    {
      key: 'pacing',
      label: 'Темп',
      strength: (video.growth ?? 0) >= 70 ? 'above-average' : 'average',
      explanation:
        (video.growth ?? 0) >= 70
          ? 'Выше среднего: смена визуального события примерно каждые 2 секунды.'
          : 'Средний: монтаж ровный, без выраженных пиков внимания.',
    },
    {
      key: 'engagement',
      label: 'Сигнал вовлечённости',
      strength: highEngagement ? 'strong' : 'average',
      explanation: highEngagement
        ? 'Сильный: доля shares выглядит непропорционально высокой к просмотрам.'
        : 'Средний: реакции в пределах ожидаемого для такого охвата.',
    },
    {
      key: 'format',
      label: 'Соответствие формата',
      strength: 'above-average',
      explanation: formatFitText[video.format],
    },
    {
      key: 'novelty',
      label: 'Новизна',
      strength: 'average',
      explanation: 'Средний: механика знакомая, но подача выглядит свежей.',
    },
  ]

  return {
    score,
    tier,
    verdict: verdictFor(tier),
    reason:
      tier === 'high'
        ? 'Сильный hook и высокая доля shares относительно просмотров.'
        : tier === 'medium'
          ? 'Понятная механика, но вовлечённость средняя для этого охвата.'
          : 'Хук проявляется поздно, а реакции не выделяются на фоне охвата.',
    adaptable: tier !== 'low',
    factors,
    keep: [
      'Вертикальный формат и близкий план — суть видна сразу.',
      tier === 'high'
        ? 'Ранний хук: обещание результата в первые секунды.'
        : 'Понятная одна идея на весь ролик, без ответвлений.',
    ],
    change: [
      'Сократить вступление до 1–2 секунд, чтобы payoff наступал раньше.',
      'Сделать текстовую подпись хука явной в первом кадре.',
    ],
    tryIdeas: [
      'Тот же приём, но с более неожиданным payoff в конце.',
      'Версия-список: 3 варианта вместо одного примера.',
    ],
    scenario: [
      { phase: 'HOOK', time: '0–2с', note: 'Обещание результата в первом кадре.' },
      { phase: 'BUILD', time: '2–7с', note: 'Быстрая демонстрация процесса без лишних деталей.' },
      { phase: 'PAYOFF', time: '7–11с', note: 'Наглядный результат, ради которого досматривают.' },
      { phase: 'CTA', time: '11–13с', note: 'Короткий призыв: сохранить или повторить.' },
    ],
    caveat: 'Оценка не гарантирует охват — это ориентир по формату, а не прогноз рекомендаций.',
  }
}
