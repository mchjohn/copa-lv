import { describe, expect, it } from 'vitest'
import { pointsForPlacement } from '@/domain/points'
import { DomainError } from '@/types/errors'

describe('pointsForPlacement', () => {
  const tables: Array<{
    matchSize: 2 | 3 | 4
    points: readonly number[]
    kValues: Array<2 | 3 | 4>
  }> = [
    { matchSize: 2, points: [1, 0], kValues: [2] },
    { matchSize: 3, points: [2, 1, 0], kValues: [3, 4] },
    { matchSize: 4, points: [3, 2, 1, 0], kValues: [4] },
  ]

  for (const { matchSize, points, kValues } of tables) {
    for (const tournamentK of kValues) {
      for (let placement = 1; placement <= matchSize; placement++) {
        it(`k=${tournamentK} size=${matchSize} placement=${placement}`, () => {
          expect(
            pointsForPlacement({ tournamentK, matchSize, placement }),
          ).toBe(points[placement - 1])
        })
      }
    }
  }

  it('rejects inconsistent k and matchSize', () => {
    expect(() =>
      pointsForPlacement({ tournamentK: 2, matchSize: 4, placement: 1 }),
    ).toThrow(DomainError)
    expect(() =>
      pointsForPlacement({ tournamentK: 3, matchSize: 2, placement: 1 }),
    ).toThrow(DomainError)
    expect(() =>
      pointsForPlacement({ tournamentK: 4, matchSize: 2, placement: 1 }),
    ).toThrow(DomainError)
  })

  it('rejects placement out of range', () => {
    expect(() =>
      pointsForPlacement({ tournamentK: 2, matchSize: 2, placement: 0 }),
    ).toThrow(DomainError)
    expect(() =>
      pointsForPlacement({ tournamentK: 2, matchSize: 2, placement: 3 }),
    ).toThrow(DomainError)
  })
})
