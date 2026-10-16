import { describe, expect, it } from 'vitest'
import {
  INVALID_CREDENTIALS_MESSAGE,
  GENERIC_LOGIN_ERROR_MESSAGE,
  mapAuthSignInError,
} from '@/features/auth/map-auth-sign-in-error'

describe('mapAuthSignInError', () => {
  it('maps invalid credentials', () => {
    const result = mapAuthSignInError({
      message: 'Invalid login credentials',
    })
    expect(result.formMessage).toBe(INVALID_CREDENTIALS_MESSAGE)
    expect(result.toastMessage).toBe(INVALID_CREDENTIALS_MESSAGE)
  })

  it('maps other auth errors to generic message', () => {
    const result = mapAuthSignInError({
      message: 'Email not confirmed',
    })
    expect(result.formMessage).toBeUndefined()
    expect(result.toastMessage).toBe(GENERIC_LOGIN_ERROR_MESSAGE)
  })
})
