import { describe, expect, it } from 'vitest'
import { mapSupabaseError } from '@/lib/map-supabase-error'

describe('mapSupabaseError', () => {
  it('maps 23505 on players to PLAYER_NAME_TAKEN', () => {
    const err = mapSupabaseError({
      code: '23505',
      message: 'duplicate key players_name_lower_uidx',
    })
    expect(err.code).toBe('PLAYER_NAME_TAKEN')
  })

  it('maps 42501 to UNAUTHORIZED', () => {
    const err = mapSupabaseError({ code: '42501', message: 'rls' })
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('maps PGRST116 to NOT_FOUND', () => {
    const err = mapSupabaseError({ code: 'PGRST116', message: 'no rows' })
    expect(err.code).toBe('NOT_FOUND')
  })
})
