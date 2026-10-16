import { useEffect, useMemo } from 'react'
import { dicebearAvatarUrl } from '@/domain/dicebear'
import { normalizePlayerName } from '@/domain/player-name'
import { PlayerAvatar } from '@/features/players/PlayerAvatar'

interface PlayerAvatarPreviewProps {
  name: string
  file: File | null
  fallbackUrl?: string
}

export function PlayerAvatarPreview({
  name,
  file,
  fallbackUrl,
}: PlayerAvatarPreviewProps) {
  const normalized = normalizePlayerName(name)
  const objectUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    if (!objectUrl) return
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  const previewUrl = useMemo(() => {
    if (objectUrl) return objectUrl
    if (fallbackUrl) return fallbackUrl
    if (normalized.length >= 1) return dicebearAvatarUrl(normalized)
    return ''
  }, [objectUrl, fallbackUrl, normalized])

  if (!previewUrl) {
    return (
      <div
        className="flex justify-center items-center bg-muted rounded-full size-16 text-muted-foreground text-sm shrink-0"
        aria-hidden
      >
        ?
      </div>
    )
  }

  return (
    <PlayerAvatar
      name={normalized || name}
      avatarUrl={previewUrl}
      className="size-16"
    />
  )
}
