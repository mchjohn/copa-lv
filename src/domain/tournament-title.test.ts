import { describe, expect, it } from 'vitest'
import {
  isValidTournamentTitle,
  normalizeTitle,
} from '@/domain/tournament-title'

describe('normalizeTitle', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeTitle('  Copa   LV  ')).toBe('Copa LV')
    expect(normalizeTitle('   ')).toBe('')
  })

  it('preserves inner content', () => {
    expect(normalizeTitle('Mario Kart')).toBe('Mario Kart')
  })
})

describe('isValidTournamentTitle', () => {
  it('allows 1–80 chars', () => {
    expect(isValidTournamentTitle('a')).toBe(true)
    expect(isValidTournamentTitle('x'.repeat(80))).toBe(true)
    expect(isValidTournamentTitle('')).toBe(false)
    expect(isValidTournamentTitle('x'.repeat(81))).toBe(false)
  })
})
