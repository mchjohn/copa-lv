import type { Uuid } from '@/types/domain'
import { DomainError } from '@/types/errors'

export function assertValidPlacements(
  playerIds: readonly Uuid[],
  placements: ReadonlyArray<{ playerId: Uuid; placement: number }>,
): void {
  const size = playerIds.length
  if (placements.length !== size) {
    throw new DomainError(
      'VALIDATION',
      'Defina colocações distintas do 1º ao último.',
    )
  }

  const playerSet = new Set(playerIds)
  const placementSet = new Set<number>()
  const seenPlayerIds = new Set<Uuid>()

  for (const { playerId, placement } of placements) {
    if (!playerSet.has(playerId) || seenPlayerIds.has(playerId)) {
      throw new DomainError(
        'VALIDATION',
        'Defina colocações distintas do 1º ao último.',
      )
    }
    seenPlayerIds.add(playerId)
    placementSet.add(placement)
  }

  if (seenPlayerIds.size !== size) {
    throw new DomainError(
      'VALIDATION',
      'Defina colocações distintas do 1º ao último.',
    )
  }

  if (placementSet.size !== size) {
    throw new DomainError(
      'VALIDATION',
      'Defina colocações distintas do 1º ao último.',
    )
  }

  for (let p = 1; p <= size; p++) {
    if (!placementSet.has(p)) {
      throw new DomainError(
        'VALIDATION',
        'Defina colocações distintas do 1º ao último.',
      )
    }
  }
}
