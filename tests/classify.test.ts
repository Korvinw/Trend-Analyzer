import { describe, expect, it } from 'vitest'
import { classifyCategory, classifyFormat, lengthBucketForDuration } from '../lib/api/classify'

describe('classifyCategory', () => {
  it('classifies known keywords', () => {
    expect(classifyCategory('5 outfit ideas for winter')).toBe('Fashion')
    expect(classifyCategory('pasta recipe in 10 minutes')).toBe('Food')
    expect(classifyCategory('home workout for back')).toBe('Fitness')
    expect(classifyCategory('skincare routine for dry skin')).toBe('Beauty')
    expect(classifyCategory('phone gadget unboxing')).toBe('Tech')
    expect(classifyCategory('diy room decor hacks')).toBe('DIY')
    expect(classifyCategory('night market in tokyo')).toBe('Travel')
    expect(classifyCategory('puppy reacts to first snow')).toBe('Pets')
  })

  it('falls back to Other', () => {
    expect(classifyCategory('random philosophical musings')).toBe('Other')
    expect(classifyCategory(null)).toBe('Other')
    expect(classifyCategory('')).toBe('Other')
  })
})

describe('classifyFormat', () => {
  it('classifies formats', () => {
    expect(classifyFormat('how to fix a squeaky door')).toBe('Tutorial')
    expect(classifyFormat('best 5 ways to save money')).toBe('List')
    expect(classifyFormat('funny cat meme compilation')).toBe('Meme')
    expect(classifyFormat('unboxing the new pixel')).toBe('Talking head')
  })

  it('falls back to Story', () => {
    expect(classifyFormat('a day in my life')).toBe('Story')
    expect(classifyFormat(null)).toBe('Story')
  })
})

describe('lengthBucketForDuration', () => {
  it('maps seconds to buckets', () => {
    expect(lengthBucketForDuration(8)).toBe('<15s')
    expect(lengthBucketForDuration(14)).toBe('<15s')
    expect(lengthBucketForDuration(15)).toBe('15–30s')
    expect(lengthBucketForDuration(30)).toBe('15–30s')
    expect(lengthBucketForDuration(31)).toBe('30–60s')
    expect(lengthBucketForDuration(60)).toBe('30–60s')
    expect(lengthBucketForDuration(159)).toBe('60s+')
  })

  it('handles unknown duration', () => {
    expect(lengthBucketForDuration(null)).toBe('15–30s')
    expect(lengthBucketForDuration(undefined)).toBe('15–30s')
  })
})