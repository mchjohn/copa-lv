import { describe, expect, it } from 'vitest'
import { pointsForPlacement } from '@/domain/points'
import { DomainError } from '@/types/errors'

describe('pointsForPlacement', () => {
  it('size 2 table', () => {
    expect(
      pointsForPlacement({ tournamentK: 2, matchSize: 2, placement: 1 }),
    ).toBe(1)
    expect(
      pointsForPlacement({ tournamentK: 2, matchSize: 2, placement: 2 }),
    ).toBe(0)
  })

  it('size 3 table (k=3 and k=4 with three players)', () => {
    expect(
      pointsForPlacement({ tournamentK: 3, matchSize: 3, placement: 1 }),
    ).toBe(2)
    expect(
      pointsForPlacement({ tournamentK: 4, matchSize: 3, placement: 3 }),
    ).toBe(0)
  })

  it('size 4 table', () => {
    expect(
      pointsForPlacement({ tournamentK: 4, matchSize: 4, placement: 1 }),
    ).toBe(3)
    expect(
      pointsForPlacement({ tournamentK: 4, matchSize: 4, placement: 4 }),
    ).toBe(0)
  })

  it('rejects inconsistent k and matchSize', () => {
    expect(() =>
      pointsForPlacement({ tournamentK: 2, matchSize: 4, placement: 1 }),
    ).toThrow(DomainError)
  })
})
