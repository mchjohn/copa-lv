import type { LeaderboardRow, RankedLeaderboardRow } from '@/types/domain'

export function rankLeaderboard(
  rows: readonly LeaderboardRow[],
): RankedLeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins
    if (a.matches_played !== b.matches_played) {
      return a.matches_played - b.matches_played
    }
    return a.player_name.localeCompare(b.player_name, 'pt-BR')
  })
  return sorted.map((row, index) => ({ ...row, position: index + 1 }))
}
