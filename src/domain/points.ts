import type { PlayersPerMatch } from '@/types/domain'
import { DomainError } from '@/types/errors'

const TABLE_SIZE_2: readonly number[] = [1, 0]
const TABLE_SIZE_3: readonly number[] = [2, 1, 0]
const TABLE_SIZE_4: readonly number[] = [3, 2, 1, 0]

function assertKMatchSizeConsistent(
  tournamentK: PlayersPerMatch,
  matchSize: 2 | 3 | 4,
): void {
  if (matchSize !== tournamentK) {
    throw new DomainError('VALIDATION', 'Partida incompatível com a modalidade.')
  }
}

export function pointsForPlacement(args: {
  tournamentK: PlayersPerMatch
  matchSize: 2 | 3 | 4
  placement: number
}): number {
  const { tournamentK, matchSize, placement } = args
  assertKMatchSizeConsistent(tournamentK, matchSize)
  if (!Number.isInteger(placement) || placement < 1 || placement > matchSize) {
    throw new DomainError('VALIDATION', 'Colocação inválida para esta partida.')
  }
  const table =
    matchSize === 2
      ? TABLE_SIZE_2
      : matchSize === 3
        ? TABLE_SIZE_3
        : TABLE_SIZE_4
  return table[placement - 1]!
}
