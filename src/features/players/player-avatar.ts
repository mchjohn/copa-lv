import { dicebearAvatarUrl } from '@/domain/dicebear'

export function isDicebearAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname === 'api.dicebear.com' &&
      parsed.pathname.includes('/avataaars/')
    )
  } catch {
    return false
  }
}

export function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.trim().slice(0, 2).toUpperCase()
}

export interface ResolvePlayerAvatarParams {
  existingAvatarUrl: string
  normalizedName: string
  previousName: string
  replaceAvatar: boolean
  uploadedPublicUrl: string | null
}

export function resolvePlayerAvatarUrlForUpdate(
  params: ResolvePlayerAvatarParams,
): string {
  const {
    existingAvatarUrl,
    normalizedName,
    previousName,
    replaceAvatar,
    uploadedPublicUrl,
  } = params

  if (replaceAvatar) {
    if (uploadedPublicUrl) return uploadedPublicUrl
    return dicebearAvatarUrl(normalizedName)
  }

  if (
    normalizedName !== previousName &&
    isDicebearAvatarUrl(existingAvatarUrl)
  ) {
    return dicebearAvatarUrl(normalizedName)
  }

  return existingAvatarUrl
}
