import { describe, expect, it } from 'vitest'
import {
  buildFinalMatch,
  buildQualifyingMatches,
  canGenerateKeys,
  combinations,
  generateBracket,
  qualifyingMatchCount,
  scheduleSequentialOneTv,
} from '@/domain/round-robin'
import type { PlayersPerMatch } from '@/types/domain'
import { DomainError } from '@/types/errors'

const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
const C = '00000000-0000-4000-8000-000000000003'
const D = '00000000-0000-4000-8000-000000000004'

const TWELVE = Array.from({ length: 12 }, (_, i) =>
  `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
)

function sortUuid(ids: readonly string[]): string[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

function playerIdsInMatch(
  m: string[] | { playerIds: string[] },
): string[] {
  return Array.isArray(m) ? m : m.playerIds
}

function assertThreeAppearances(
  playerIds: readonly string[],
  matches: readonly (string[] | { playerIds: string[] })[],
) {
  const counts = new Map<string, number>()
  for (const id of playerIds) counts.set(id, 0)
  for (const m of matches) {
    for (const id of playerIdsInMatch(m)) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  for (const id of playerIds) {
    expect(counts.get(id)).toBe(3)
  }
}

describe('combinations', () => {
  it('C(4,2) has 6 pairs in lex order', () => {
    const result = combinations([1, 2, 3, 4], 2)
    expect(result).toHaveLength(6)
    expect(result[0]).toEqual([1, 2])
    expect(result[5]).toEqual([3, 4])
  })
})

describe('qualifyingMatchCount', () => {
  it('matches N=12 fixture for each k', () => {
    expect(qualifyingMatchCount(12, 4)).toBe(9)
    expect(qualifyingMatchCount(12, 3)).toBe(12)
    expect(qualifyingMatchCount(12, 2)).toBe(18)
  })
})

describe('canGenerateKeys', () => {
  const ks: PlayersPerMatch[] = [2, 3, 4]

  it('covers n=1..5 for each k (ADR-04)', () => {
    const expected: Record<PlayersPerMatch, boolean[]> = {
      2: [false, true, false, true, false],
      3: [false, false, true, true, true],
      4: [false, false, false, true, false],
    }
    for (const k of ks) {
      for (let n = 1; n <= 5; n++) {
        expect(canGenerateKeys(n, k)).toBe(expected[k][n - 1])
      }
    }
  })

  it('allows N=12 for all modalities', () => {
    expect(canGenerateKeys(12, 2)).toBe(true)
    expect(canGenerateKeys(12, 3)).toBe(true)
    expect(canGenerateKeys(12, 4)).toBe(true)
  })

  it('rejects k=2 n=3 and k=4 n=5', () => {
    expect(canGenerateKeys(3, 2)).toBe(false)
    expect(canGenerateKeys(5, 4)).toBe(false)
  })
})

describe('buildQualifyingMatches', () => {
  it('n=2 k=2 yields three duels', () => {
    const sorted = sortUuid([A, B])
    const raw = buildQualifyingMatches(sorted, 2)
    expect(raw).toHaveLength(3)
    for (const m of raw) {
      expect(m).toHaveLength(2)
    }
    assertThreeAppearances(sorted, raw)
  })
})

describe('scheduleSequentialOneTv', () => {
  it('assigns one match per roundNumber without changing multisets', () => {
    const sorted = sortUuid([A, B, C, D])
    const raw = buildQualifyingMatches(sorted, 2)
    const scheduled = scheduleSequentialOneTv(raw)
    expect(scheduled).toHaveLength(raw.length)
    const roundNumbers = scheduled.map((m) => m.roundNumber)
    expect(roundNumbers).toEqual(
      Array.from({ length: raw.length }, (_, i) => i + 1),
    )
    const multisetRaw = raw.map((m) => m.join(',')).sort()
    const multisetScheduled = scheduled
      .map((m) => m.playerIds.join(','))
      .sort()
    expect(multisetScheduled).toEqual(multisetRaw)
    for (const m of scheduled) {
      expect(m.phase).toBe('qualifying')
    }
  })
})

describe('generateBracket', () => {
  it('is stable regardless of input order', () => {
    const shuffled = [D, B, A, C]
    const ordered = [A, B, C, D]
    expect(generateBracket(shuffled, 2)).toEqual(generateBracket(ordered, 2))
  })

  it('N=12 k=2: 18 rounds, 3 appearances each', () => {
    const bracket = generateBracket(TWELVE, 2)
    expect(bracket).toHaveLength(18)
    assertThreeAppearances(TWELVE, bracket)
    expect(bracket.map((m) => m.roundNumber)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    )
    expect(bracket).toMatchSnapshot()
  })

  it('N=12 k=3: 12 rounds, 3 appearances each', () => {
    const bracket = generateBracket(TWELVE, 3)
    expect(bracket).toHaveLength(12)
    assertThreeAppearances(TWELVE, bracket)
    expect(bracket).toMatchSnapshot()
  })

  it('N=12 k=4: 9 rounds, 3 appearances each, max gap ≤ 4', () => {
    const bracket = generateBracket(TWELVE, 4)
    expect(bracket).toHaveLength(9)
    assertThreeAppearances(TWELVE, bracket)
    const lastRound = new Map<string, number>()
    let maxGap = 0
    for (const m of bracket) {
      for (const id of m.playerIds) {
        const prev = lastRound.get(id) ?? 0
        if (prev > 0) {
          maxGap = Math.max(maxGap, m.roundNumber - prev)
        }
        lastRound.set(id, m.roundNumber)
      }
    }
    expect(maxGap).toBeLessThanOrEqual(4)
    expect(bracket).toMatchSnapshot()
  })

  it('throws NOT_ENOUGH_PLAYERS when keys invalid', () => {
    expect(() => generateBracket([A, B, C], 4)).toThrow(DomainError)
  })
})

describe('buildFinalMatch', () => {
  it('uses rank order and next round', () => {
    const top = [B, A, C, D]
    expect(buildFinalMatch(top, 9, 4)).toEqual({
      playerIds: top,
      roundNumber: 10,
      phase: 'final',
    })
  })

  it('validates k', () => {
    expect(() => buildFinalMatch([A, B], 5, 4)).toThrow(DomainError)
  })
})
