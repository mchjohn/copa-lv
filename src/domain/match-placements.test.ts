import { describe, expect, it } from 'vitest'
import { assertValidPlacements } from '@/domain/match-placements'
import { DomainError } from '@/types/errors'

const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
const C = '00000000-0000-4000-8000-000000000003'

describe('assertValidPlacements', () => {
  it('accepts a valid permutation', () => {
    expect(() =>
      assertValidPlacements([A, B, C], [
        { playerId: A, placement: 2 },
        { playerId: B, placement: 1 },
        { playerId: C, placement: 3 },
      ]),
    ).not.toThrow()
  })

  it('rejects duplicate placements', () => {
    expect(() =>
      assertValidPlacements([A, B, C], [
        { playerId: A, placement: 1 },
        { playerId: B, placement: 1 },
        { playerId: C, placement: 2 },
      ]),
    ).toThrow(DomainError)
  })

  it('rejects incomplete placements', () => {
    expect(() =>
      assertValidPlacements([A, B, C], [
        { playerId: A, placement: 1 },
        { playerId: B, placement: 2 },
      ]),
    ).toThrow(DomainError)
  })
})
