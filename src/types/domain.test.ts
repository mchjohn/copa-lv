import { describe, expect, it } from 'vitest'
import { asPlayersPerMatch } from '@/types/domain'
import { DomainError } from '@/types/errors'

describe('asPlayersPerMatch', () => {
  it('accepts 2, 3, 4', () => {
    expect(asPlayersPerMatch(4)).toBe(4)
  })

  it('rejects invalid modality', () => {
    expect(() => asPlayersPerMatch(5)).toThrow(DomainError)
  })
})
