import type { MatchStatus, RankedLeaderboardRow } from '@/types/domain'

export function canFinalize(
  matches: readonly { status: MatchStatus }[],
): boolean {
  return matches.length > 0 && matches.every((m) => m.status === 'completed')
}

export interface PodiumSlot {
  position: 1 | 2 | 3
  row: RankedLeaderboardRow | null
}

export function podiumSlots(
  ranked: readonly RankedLeaderboardRow[],
): [PodiumSlot, PodiumSlot, PodiumSlot] {
  const at = (pos: 1 | 2 | 3): PodiumSlot => ({
    position: pos,
    row: ranked.find((r) => r.position === pos) ?? null,
  })
  return [at(2), at(1), at(3)]
}
