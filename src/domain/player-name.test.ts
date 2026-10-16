import { describe, expect, it } from 'vitest'
import { dicebearAvatarUrl } from '@/domain/dicebear'
import { isValidPlayerName, normalizePlayerName } from '@/domain/player-name'

describe('normalizePlayerName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizePlayerName('  Ana   Silva  ')).toBe('Ana Silva')
  })

  it('preserves case', () => {
    expect(normalizePlayerName('JoÃO')).toBe('JoÃO')
  })
})

describe('isValidPlayerName', () => {
  it('allows 1–40 chars', () => {
    expect(isValidPlayerName('a')).toBe(true)
    expect(isValidPlayerName('x'.repeat(40))).toBe(true)
    expect(isValidPlayerName('')).toBe(false)
    expect(isValidPlayerName('x'.repeat(41))).toBe(false)
  })
})

describe('dicebearAvatarUrl', () => {
  it('uses avataaars style only', () => {
    expect(dicebearAvatarUrl('Ana Silva')).toBe(
      'https://api.dicebear.com/9.x/avataaars/svg?seed=Ana%20Silva',
    )
  })
})
