import type { Category, LengthBucket, VideoFormat } from '../types'

/**
 * The TikTok endpoint does not return category/format — these are keyword
 * heuristics on the title. They are derived, not measured; the UI filters
 * still work, but the values are best-effort guesses.
 */

const CATEGORY_KEYWORDS: Record<Exclude<Category, 'Other'>, string[]> = {
  Fashion: ['fashion', 'outfit', 'ootd', 'style', 'dress', 'jeans', 'sneaker', 'bag', 'wardrobe', 'haul', 'lookbook', 'try on', 'styling'],
  Food: ['food', 'recipe', 'cook', 'kitchen', 'pasta', 'coffee', 'chicken', 'breakfast', 'dinner', 'snack', 'bake', 'cake', 'eat', 'restaurant', 'menu', 'chef', 'tasty', 'delicious'],
  Fitness: ['workout', 'gym', 'fitness', 'exercise', 'training', 'run', 'yoga', 'stretch', 'muscle', 'cardio', 'squat', 'dumbbell', 'abs', 'strength', 'weight loss', 'pilates'],
  Beauty: ['makeup', 'skin', 'skincare', 'beauty', 'hair', 'nails', 'serum', 'brow', 'lip', 'glow', 'mascara', 'foundation', 'lotion', 'cosmetic', 'face'],
  Tech: ['phone', 'gadget', 'apple', 'android', 'iphone', 'samsung', 'tech', 'ai', 'camera', 'laptop', 'app', 'google', 'pixel', 'device', 'software', 'gadgets', 'review', 'unbox'],
  DIY: ['diy', 'hack', 'fix', 'repair', 'build', 'organize', 'organising', 'decor', 'room', 'wall', 'craft', 'home', 'clean', 'cleaning', 'organizer'],
  Travel: ['travel', 'trip', 'vacation', 'hotel', 'beach', 'city', 'market', 'flight', 'destination', 'airport', 'adventure', 'tourist', 'island'],
  Pets: ['dog', 'cat', 'puppy', 'kitten', 'pet', 'animals', 'vet', 'furry'],
}

const FORMAT_KEYWORDS: Record<Exclude<VideoFormat, 'Story'>, string[]> = {
  Tutorial: ['how to', 'tutorial', 'recipe', 'diy', 'fix', 'hack', 'guide', 'tips', 'tricks', 'learn', 'step by step', 'masterclass', 'easy', 'quick', 'simple'],
  List: ['best', 'top', 'things', 'ways', 'ideas', 'mistakes', 'checklist', 'options', 'versions'],
  'Talking head': ['unboxing', 'review', 'explain', 'explains', 'talk', 'opinion', 'rant', 'storytime'],
  Meme: ['meme', 'funny', 'hilarious', 'reaction', 'comedy', 'satire', 'fail', 'prank', 'lol', 'joke', 'cringe', 'relatable'],
}

const LIST_PATTERN = /\b\d{1,2}\b/

export function classifyCategory(title: string | null | undefined): Category {
  const text = (title ?? '').toLowerCase()
  let best: Category = 'Other'
  let bestScore = 0
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => (text.includes(kw) ? acc + 1 : acc), 0)
    if (score > bestScore) {
      bestScore = score
      best = category as Exclude<Category, 'Other'>
    }
  }
  return best
}

export function classifyFormat(title: string | null | undefined): VideoFormat {
  const text = (title ?? '').toLowerCase()
  let best: VideoFormat = 'Story'
  let bestScore = 0
  for (const [format, keywords] of Object.entries(FORMAT_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => (text.includes(kw) ? acc + 1 : acc), 0)
    if (score > bestScore) {
      bestScore = score
      best = format as Exclude<VideoFormat, 'Story'>
    }
  }
  if (bestScore === 0 && LIST_PATTERN.test(text)) best = 'List'
  return best
}

/** Raw duration seconds -> frontend length bucket. */
export function lengthBucketForDuration(duration: number | null | undefined): LengthBucket {
  if (duration == null || duration < 0) return '15–30s'
  if (duration < 15) return '<15s'
  if (duration <= 30) return '15–30s'
  if (duration <= 60) return '30–60s'
  return '60s+'
}