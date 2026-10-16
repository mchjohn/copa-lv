import { describe, expect, it } from 'vitest'
import { canFinalize, podiumSlots } from '@/domain/finalize-podium'
import type { RankedLeaderboardRow } from '@/types/domain'

function rankedRow(
  position: number,
  overrides: Partial<RankedLeaderboardRow> = {},
): RankedLeaderboardRow {
  return {
    tournament_id: 't1',
    player_id: `p${position}`,
    player_name: `Player ${position}`,
    player_avatar: 'https://example.com/a.png',
    matches_played: 1,
    total_wins: 0,
    total_points: 10 - position,
    position,
    ...overrides,
  }
}

describe('canFinalize', () => {
  it('returns false for empty matches', () => {
    expect(canFinalize([])).toBe(false)
  })

  it('returns true when all matches are completed', () => {
    expect(
      canFinalize([
        { status: 'completed' },
        { status: 'completed' },
      ]),
    ).toBe(true)
  })

  it('returns false when any match is pending', () => {
    expect(
      canFinalize([
        { status: 'completed' },
        { status: 'pending' },
      ]),
    ).toBe(false)
  })
})

describe('podiumSlots', () => {
  it('returns visual order [2, 1, 3]', () => {
    const ranked = [rankedRow(1), rankedRow(2), rankedRow(3)]
    const slots = podiumSlots(ranked)
    expect(slots.map((s) => s.position)).toEqual([2, 1, 3])
    expect(slots[1].row?.player_id).toBe('p1')
    expect(slots[0].row?.player_id).toBe('p2')
    expect(slots[2].row?.player_id).toBe('p3')
  })

  it('leaves third slot null when only two ranked players', () => {
    const ranked = [rankedRow(1), rankedRow(2)]
    const slots = podiumSlots(ranked)
    expect(slots[2].position).toBe(3)
    expect(slots[2].row).toBeNull()
  })
})
