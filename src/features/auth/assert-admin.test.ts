import { describe, expect, it } from 'vitest'
import { assertAdmin } from '@/features/auth/assert-admin'
import { DomainError } from '@/types/errors'

describe('assertAdmin', () => {
  it('does not throw when admin', () => {
    expect(() => assertAdmin(true)).not.toThrow()
  })

  it('throws UNAUTHORIZED when not admin', () => {
    expect(() => assertAdmin(false)).toThrow(DomainError)
    try {
      assertAdmin(false)
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError)
      expect((err as DomainError).code).toBe('UNAUTHORIZED')
      expect((err as DomainError).message).toBe(
        'Faça login para executar esta ação.',
      )
    }
  })
})
