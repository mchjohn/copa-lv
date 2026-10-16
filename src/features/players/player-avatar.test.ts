import { describe, expect, it } from 'vitest'
import {
  isDicebearAvatarUrl,
  playerInitials,
  resolvePlayerAvatarUrlForUpdate,
} from '@/features/players/player-avatar'

describe('isDicebearAvatarUrl', () => {
  it('detects DiceBear avataaars URLs', () => {
    expect(
      isDicebearAvatarUrl(
        'https://api.dicebear.com/9.x/avataaars/svg?seed=Ana',
      ),
    ).toBe(true)
    expect(isDicebearAvatarUrl('https://example.com/photo.jpg')).toBe(false)
  })
})

describe('resolvePlayerAvatarUrlForUpdate', () => {
  const dicebearAna =
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Ana'
  const dicebearMaria =
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Maria'
  const uploadUrl = 'https://project.supabase.co/storage/v1/object/public/avatars/x.jpg'

  it('regenerates DiceBear when name changes without replaceAvatar', () => {
    expect(
      resolvePlayerAvatarUrlForUpdate({
        existingAvatarUrl: dicebearAna,
        normalizedName: 'Maria',
        previousName: 'Ana',
        replaceAvatar: false,
        uploadedPublicUrl: null,
      }),
    ).toBe(dicebearMaria)
  })

  it('keeps upload URL when name changes without replaceAvatar', () => {
    expect(
      resolvePlayerAvatarUrlForUpdate({
        existingAvatarUrl: uploadUrl,
        normalizedName: 'Maria',
        previousName: 'Ana',
        replaceAvatar: false,
        uploadedPublicUrl: null,
      }),
    ).toBe(uploadUrl)
  })

  it('uses uploaded URL when replaceAvatar with file', () => {
    const newUpload = 'https://project.supabase.co/storage/v1/object/public/avatars/y.png'
    expect(
      resolvePlayerAvatarUrlForUpdate({
        existingAvatarUrl: uploadUrl,
        normalizedName: 'Ana',
        previousName: 'Ana',
        replaceAvatar: true,
        uploadedPublicUrl: newUpload,
      }),
    ).toBe(newUpload)
  })

  it('falls back to DiceBear when replaceAvatar without file', () => {
    expect(
      resolvePlayerAvatarUrlForUpdate({
        existingAvatarUrl: uploadUrl,
        normalizedName: 'Ana',
        previousName: 'Ana',
        replaceAvatar: true,
        uploadedPublicUrl: null,
      }),
    ).toBe(dicebearAna)
  })
})

describe('playerInitials', () => {
  it('uses two words when available', () => {
    expect(playerInitials('Ana Maria')).toBe('AM')
  })
})
