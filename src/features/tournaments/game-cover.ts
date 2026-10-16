import { mapSupabaseError } from '@/lib/map-supabase-error'
import { supabase } from '@/lib/supabase'
import { DomainError } from '@/types/errors'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const MAX_GAME_COVER_BYTES = 5 * 1024 * 1024

export function validateGameCoverFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new DomainError(
      'VALIDATION',
      'Imagem inválida. Use JPG, PNG ou WebP.',
    )
  }
  if (file.size > MAX_GAME_COVER_BYTES) {
    throw new DomainError(
      'VALIDATION',
      'A imagem deve ter no máximo 5 MB.',
    )
  }
}

function extensionForUpload(file: File): 'jpg' | 'png' | 'webp' {
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  throw new DomainError(
    'VALIDATION',
    'Imagem inválida. Use JPG, PNG ou WebP.',
  )
}

export async function uploadGameCover(file: File): Promise<string> {
  validateGameCoverFile(file)
  const ext = extensionForUpload(file)
  const objectPath = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('game-covers')
    .upload(objectPath, file, {
      upsert: false,
      contentType: file.type,
    })
  if (error) throw mapSupabaseError(error)
  const { data } = supabase.storage.from('game-covers').getPublicUrl(objectPath)
  return data.publicUrl
}
