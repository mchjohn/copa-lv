import type {
  CombinationMatch,
  PlayersPerMatch,
  Uuid,
} from '@/types/domain'
import { DomainError } from '@/types/errors'

export function effectiveMatchSize(
  n: number,
  k: PlayersPerMatch,
): PlayersPerMatch {
  if (k === 4 && n === 3) return 3
  return k
}

export function canGenerateKeys(n: number, k: PlayersPerMatch): boolean {
  if (k === 2) return n >= 2
  if (k === 3) return n >= 3
  return n >= 3
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

export function packRounds(matches: readonly Uuid[][]): CombinationMatch[] {
  const occupied = new Map<number, Set<Uuid>>()

  return matches.map((playerIds) => {
    let round = 1
    while (true) {
      const set = occupied.get(round) ?? new Set<Uuid>()
      const clash = playerIds.some((id) => set.has(id))
      if (!clash) {
        if (!occupied.has(round)) occupied.set(round, new Set())
        const bucket = occupied.get(round)!
        for (const id of playerIds) bucket.add(id)
        return { playerIds: [...playerIds], roundNumber: round }
      }
      round += 1
    }
  })
}

function sortUuid(ids: readonly Uuid[]): Uuid[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

export function generateBracket(
  playerIds: readonly Uuid[],
  k: PlayersPerMatch,
): CombinationMatch[] {
  const n = playerIds.length
  if (!canGenerateKeys(n, k)) {
    throw new DomainError(
      'NOT_ENOUGH_PLAYERS',
      'Número de jogadores insuficiente para gerar as chaves.',
    )
  }
  const sorted = sortUuid(playerIds)
  const size = effectiveMatchSize(n, k)
  const raw = combinations(sorted, size)
  return packRounds(raw)
}
