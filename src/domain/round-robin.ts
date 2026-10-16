import type { PlayersPerMatch, ScheduledMatch, Uuid } from '@/types/domain'
import { DomainError } from '@/types/errors'

export const NOT_ENOUGH_PLAYERS_MESSAGE =
  'Número de jogadores incompatível com a modalidade. Cada jogador deve jogar exatamente 3 partidas classificatórias.'

export function qualifyingMatchCount(n: number, k: PlayersPerMatch): number {
  return (n * 3) / k
}

export function canGenerateKeys(n: number, k: PlayersPerMatch): boolean {
  if (k === 2) return n >= 2 && (n * 3) % 2 === 0
  if (k === 3) return n >= 3 && (n * 3) % 3 === 0
  return n >= 4 && (n * 3) % 4 === 0
}

export function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k < 1 || k > items.length) return []

  const result: T[][] = []
  const current: number[] = []

  function backtrack(start: number) {
    if (current.length === k) {
      result.push(current.map((i) => items[i]!))
      return
    }
    for (let i = start; i <= items.length - (k - current.length); i++) {
      current.push(i)
      backtrack(i + 1)
      current.pop()
    }
  }

  backtrack(0)
  return result
}

function sortUuid(ids: readonly Uuid[]): Uuid[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

function lexCompareUuidTuple(a: readonly Uuid[], b: readonly Uuid[]): number {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i]! < b[i]!) return -1
    if (a[i]! > b[i]!) return 1
  }
  return a.length - b.length
}

export function buildQualifyingMatches(
  sorted: readonly Uuid[],
  k: PlayersPerMatch,
): Uuid[][] {
  const n = sorted.length
  const targetMatches = qualifyingMatchCount(n, k)
  const appearances = 3
  const counts = new Map<Uuid, number>()
  for (const id of sorted) counts.set(id, 0)

  const matches: Uuid[][] = []

  function search(): boolean {
    if (matches.length === targetMatches) {
      return sorted.every((id) => counts.get(id) === appearances)
    }

    const available = sorted.filter((id) => (counts.get(id) ?? 0) < appearances)
    const candidates = combinations(available, k)

    for (const candidate of candidates) {
      for (const id of candidate) {
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
      matches.push(candidate)
      if (search()) return true
      matches.pop()
      for (const id of candidate) {
        counts.set(id, (counts.get(id) ?? 0) - 1)
      }
    }
    return false
  }

  if (!search()) {
    throw new DomainError('NOT_ENOUGH_PLAYERS', NOT_ENOUGH_PLAYERS_MESSAGE)
  }
  return matches
}

export function scheduleSequentialOneTv(
  matches: readonly Uuid[][],
): ScheduledMatch[] {
  const scheduled: ScheduledMatch[] = []
  const lastRound = new Map<Uuid, number>()
  const remaining = matches.map((playerIds, originalIndex) => ({
    playerIds,
    originalIndex,
  }))

  while (remaining.length > 0) {
    const scheduledLen = scheduled.length
    let bestIndex = 0
    let bestBottleneck = -Infinity
    let bestLex: Uuid[] = remaining[0]!.playerIds
    let bestOriginal = remaining[0]!.originalIndex

    for (let i = 0; i < remaining.length; i++) {
      const { playerIds, originalIndex } = remaining[i]!
      let bottleneck = Infinity
      for (const playerId of playerIds) {
        const wait = scheduledLen - (lastRound.get(playerId) ?? 0)
        if (wait < bottleneck) bottleneck = wait
      }

      const lexKey = sortUuid(playerIds)
      const better =
        bottleneck > bestBottleneck ||
        (bottleneck === bestBottleneck &&
          lexCompareUuidTuple(lexKey, bestLex) < 0) ||
        (bottleneck === bestBottleneck &&
          lexCompareUuidTuple(lexKey, bestLex) === 0 &&
          originalIndex < bestOriginal)

      if (better) {
        bestIndex = i
        bestBottleneck = bottleneck
        bestLex = lexKey
        bestOriginal = originalIndex
      }
    }

    const chosen = remaining.splice(bestIndex, 1)[0]!
    const roundNumber = scheduled.length + 1
    for (const playerId of chosen.playerIds) {
      lastRound.set(playerId, roundNumber)
    }
    scheduled.push({
      playerIds: [...chosen.playerIds],
      roundNumber,
      phase: 'qualifying',
    })
  }

  return scheduled
}

export function generateBracket(
  playerIds: readonly Uuid[],
  k: PlayersPerMatch,
): ScheduledMatch[] {
  const n = playerIds.length
  if (!canGenerateKeys(n, k)) {
    throw new DomainError('NOT_ENOUGH_PLAYERS', NOT_ENOUGH_PLAYERS_MESSAGE)
  }
  const sorted = sortUuid(playerIds)
  const raw = buildQualifyingMatches(sorted, k)
  return scheduleSequentialOneTv(raw)
}

export function buildFinalMatch(
  topPlayerIds: readonly Uuid[],
  afterRoundNumber: number,
  k: PlayersPerMatch,
): ScheduledMatch {
  if (topPlayerIds.length !== k) {
    throw new DomainError(
      'VALIDATION',
      'Elenco da grande final incompatível com a modalidade.',
    )
  }
  return {
    playerIds: [...topPlayerIds],
    roundNumber: afterRoundNumber + 1,
    phase: 'final',
  }
}

export function qualifyingMatchCountForRoster(
  playerCount: number,
  k: PlayersPerMatch,
): number | null {
  if (!canGenerateKeys(playerCount, k)) return null
  return qualifyingMatchCount(playerCount, k)
}
