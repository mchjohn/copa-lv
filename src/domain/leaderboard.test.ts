import { describe, expect, it } from 'vitest'
import { rankLeaderboard } from '@/domain/leaderboard'
import type { LeaderboardRow } from '@/types/domain'

const base = (overrides: Partial<LeaderboardRow>): LeaderboardRow => ({
  tournament_id: 't1',
  player_id: 'p1',
  player_name: 'Ana',
  player_avatar: '',
  matches_played: 0,
  total_wins: 0,
  total_points: 0,
  ...overrides,
})

describe('rankLeaderboard', () => {
  it('sorts by points, wins, fewer matches, then name', () => {
    const rows = [
      base({
        player_id: '1',
        player_name: 'Bruno',
        total_points: 10,
        total_wins: 2,
        matches_played: 3,
      }),
      base({
        player_id: '2',
        player_name: 'Ana',
        total_points: 10,
        total_wins: 2,
        matches_played: 2,
      }),
      base({
        player_id: '3',
        player_name: 'Carla',
        total_points: 12,
        total_wins: 1,
        matches_played: 1,
      }),
    ]
    const ranked = rankLeaderboard(rows)
    expect(ranked.map((r) => r.player_name)).toEqual(['Carla', 'Ana', 'Bruno'])
    expect(ranked.map((r) => r.position)).toEqual([1, 2, 3])
  })

  it('breaks ties on pt-BR name with distinct positions', () => {
    const rows = [
      base({ player_id: '1', player_name: 'Bruno' }),
      base({ player_id: '2', player_name: 'Ana' }),
    ]
    const ranked = rankLeaderboard(rows)
    expect(ranked.map((r) => r.player_name)).toEqual(['Ana', 'Bruno'])
    expect(ranked.map((r) => r.position)).toEqual([1, 2])
  })
})
