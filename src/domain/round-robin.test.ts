import { describe, expect, it } from 'vitest'
import {
  canGenerateKeys,
  combinations,
  effectiveMatchSize,
  generateBracket,
  packRounds,
} from '@/domain/round-robin'

const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
const C = '00000000-0000-4000-8000-000000000003'
const D = '00000000-0000-4000-8000-000000000004'
const E = '00000000-0000-4000-8000-000000000005'

describe('combinations', () => {
  it('C(4,2) has 6 pairs in lex order', () => {
    const result = combinations([1, 2, 3, 4], 2)
    expect(result).toHaveLength(6)
    expect(result[0]).toEqual([1, 2])
    expect(result[5]).toEqual([3, 4])
  })
})

describe('canGenerateKeys', () => {
  it('matches ADR-04 minimums', () => {
    expect(canGenerateKeys(1, 2)).toBe(false)
    expect(canGenerateKeys(2, 2)).toBe(true)
    expect(canGenerateKeys(2, 3)).toBe(false)
    expect(canGenerateKeys(3, 3)).toBe(true)
    expect(canGenerateKeys(2, 4)).toBe(false)
    expect(canGenerateKeys(3, 4)).toBe(true)
    expect(canGenerateKeys(4, 4)).toBe(true)
  })
})

describe('effectiveMatchSize', () => {
  it('handles k=4 edge cases', () => {
    expect(effectiveMatchSize(3, 4)).toBe(3)
    expect(effectiveMatchSize(5, 4)).toBe(4)
    expect(effectiveMatchSize(4, 4)).toBe(4)
  })
})

describe('packRounds', () => {
  it('assigns no overlapping players per round', () => {
    const raw = combinations([A, B, C, D], 2)
    const packed = packRounds(raw)
    const byRound = new Map<number, string[]>()
    for (const m of packed) {
      const list = byRound.get(m.roundNumber) ?? []
      list.push(...m.playerIds)
      byRound.set(m.roundNumber, list)
    }
    for (const ids of byRound.values()) {
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('greedy packing snapshot for four players k=2', () => {
    const raw = combinations([A, B, C, D], 2)
    expect(packRounds(raw)).toEqual([
      { playerIds: [A, B], roundNumber: 1 },
      { playerIds: [A, C], roundNumber: 2 },
      { playerIds: [A, D], roundNumber: 3 },
      { playerIds: [B, C], roundNumber: 3 },
      { playerIds: [B, D], roundNumber: 2 },
      { playerIds: [C, D], roundNumber: 1 },
    ])
  })
})

describe('generateBracket', () => {
  it('is stable regardless of input order', () => {
    const shuffled = [D, B, A, C]
    const ordered = [A, B, C, D]
    expect(generateBracket(shuffled, 2)).toEqual(generateBracket(ordered, 2))
  })

  it('n=5 k=4 produces five matches of four players', () => {
    const bracket = generateBracket([A, B, C, D, E], 4)
    expect(bracket).toHaveLength(5)
    for (const m of bracket) {
      expect(m.playerIds).toHaveLength(4)
    }
  })
})
