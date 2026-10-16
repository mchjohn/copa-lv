import { dicebearAvatarUrl } from '@/domain/dicebear'
import {
  isValidPlayerName,
  normalizePlayerName,
} from '@/domain/player-name'
import { assertAdmin } from '@/features/auth/assert-admin'
import { resolvePlayerAvatarUrlForUpdate } from '@/features/players/player-avatar'
import { mapSupabaseError } from '@/lib/map-supabase-error'
import { supabase } from '@/lib/supabase'
import type { Player, Uuid } from '@/types/domain'
import { DomainError } from '@/types/errors'

export const playersQueryKeys = {
  all: ['players'] as const,
  detail: (id: Uuid) => ['players', id] as const,
  tournamentCount: (playerId: Uuid) =>
    ['player-tournament-count', playerId] as const,
}

export interface CreatePlayerInput {
  name: string
  file: File | null
}

export interface UpdatePlayerInput {
  id: Uuid
  name: string
  file: File | null
  replaceAvatar: boolean
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function validateAndNormalizeName(raw: string): string {
  const name = normalizePlayerName(raw)
  if (!isValidPlayerName(name)) {
    throw new DomainError(
      'VALIDATION',
      'Informe um nome com até 40 caracteres.',
    )
  }
  return name
}

export function validatePlayerImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new DomainError(
      'VALIDATION',
      'Imagem inválida. Use JPG, PNG ou WebP.',
    )
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new DomainError(
      'VALIDATION',
      'A imagem deve ter no máximo 2 MB.',
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

async function uploadAvatar(file: File): Promise<string> {
  validatePlayerImageFile(file)
  const ext = extensionForUpload(file)
  const objectPath = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(objectPath, file, {
      upsert: false,
      contentType: file.type,
    })
  if (error) throw mapSupabaseError(error)
  const { data } = supabase.storage.from('avatars').getPublicUrl(objectPath)
  return data.publicUrl
}

function sortPlayersByName(players: Player[]): Player[] {
  return [...players].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
}

export async function listPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*')
  if (error) throw mapSupabaseError(error)
  return sortPlayersByName(data ?? [])
}

export async function getPlayer(id: Uuid): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw mapSupabaseError(error)
  return data
}

export async function getPlayerTournamentCount(playerId: Uuid): Promise<number> {
  const { count, error } = await supabase
    .from('tournament_players')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
  if (error) throw mapSupabaseError(error)
  return count ?? 0
}

export async function createPlayer(
  input: CreatePlayerInput,
  isAdmin: boolean,
): Promise<Player> {
  assertAdmin(isAdmin)
  const name = validateAndNormalizeName(input.name)

  let avatar_url: string
  if (input.file) {
    avatar_url = await uploadAvatar(input.file)
  } else {
    avatar_url = dicebearAvatarUrl(name)
  }

  const { data, error } = await supabase
    .from('players')
    .insert({ name, avatar_url })
    .select()
    .single()
  if (error) throw mapSupabaseError(error)
  return data
}

export async function updatePlayer(
  input: UpdatePlayerInput,
  isAdmin: boolean,
  existing: Player,
): Promise<Player> {
  assertAdmin(isAdmin)
  const name = validateAndNormalizeName(input.name)

  let uploadedPublicUrl: string | null = null
  if (input.replaceAvatar && input.file) {
    uploadedPublicUrl = await uploadAvatar(input.file)
  }

  const avatar_url = resolvePlayerAvatarUrlForUpdate({
    existingAvatarUrl: existing.avatar_url,
    normalizedName: name,
    previousName: existing.name,
    replaceAvatar: input.replaceAvatar,
    uploadedPublicUrl,
  })

  const { data, error } = await supabase
    .from('players')
    .update({ name, avatar_url })
    .eq('id', input.id)
    .select()
    .single()
  if (error) throw mapSupabaseError(error)
  return data
}

export async function deletePlayer(id: Uuid, isAdmin: boolean): Promise<void> {
  assertAdmin(isAdmin)
  const count = await getPlayerTournamentCount(id)
  if (count > 0) {
    throw new DomainError(
      'PLAYER_IN_TOURNAMENT',
      'Não é possível excluir um jogador vinculado a um campeonato.',
    )
  }
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) throw mapSupabaseError(error, { operation: 'deletePlayer' })
}
