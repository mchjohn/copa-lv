import {
  isValidTournamentTitle,
  normalizeTitle,
} from '@/domain/tournament-title'
import { assertAdmin } from '@/features/auth/assert-admin'
import { mapSupabaseError } from '@/lib/map-supabase-error'
import { supabase } from '@/lib/supabase'
import type {
  Player,
  PlayersPerMatch,
  Tournament,
  TournamentStatus,
  Uuid,
} from '@/types/domain'
import { asPlayersPerMatch, isDraft } from '@/types/domain'
import { DomainError } from '@/types/errors'

export const tournamentsQueryKeys = {
  all: ['tournaments'] as const,
  detail: (id: Uuid) => ['tournaments', id] as const,
  roster: (id: Uuid) => ['tournament-roster', id] as const,
}

export interface TournamentWithRoster extends Tournament {
  players: Player[]
}

export interface CreateTournamentInput {
  title: string
  game_name: string
  game_image_url: string
  players_per_match: PlayersPerMatch
  playerIds: Uuid[]
}

export interface UpdateTournamentInput {
  id: Uuid
  title: string
  game_name: string
  game_image_url: string
  players_per_match: PlayersPerMatch
  playerIds: Uuid[]
}

function validateTitleFields(titleRaw: string, gameNameRaw: string): {
  title: string
  game_name: string
} {
  const title = normalizeTitle(titleRaw)
  const game_name = normalizeTitle(gameNameRaw)
  if (!isValidTournamentTitle(title) || !isValidTournamentTitle(game_name)) {
    throw new DomainError(
      'VALIDATION',
      'Título e nome do jogo devem ter entre 1 e 80 caracteres.',
    )
  }
  return { title, game_name }
}

function uniquePlayerIds(playerIds: readonly Uuid[]): Uuid[] {
  return [...new Set(playerIds)]
}

function assertRosterWritable(status: TournamentStatus): void {
  if (!isDraft(status)) {
    throw new DomainError(
      'ROSTER_FROZEN',
      'O elenco não pode ser alterado após o início do campeonato.',
    )
  }
}

async function insertRosterRows(
  tournamentId: Uuid,
  playerIds: readonly Uuid[],
): Promise<void> {
  const ids = uniquePlayerIds(playerIds)
  if (ids.length === 0) return
  const rows = ids.map((player_id) => ({
    tournament_id: tournamentId,
    player_id,
  }))
  const { error } = await supabase.from('tournament_players').insert(rows)
  if (error) throw mapSupabaseError(error)
}

async function replaceRoster(
  tournamentId: Uuid,
  playerIds: readonly Uuid[],
  status: TournamentStatus,
): Promise<void> {
  assertRosterWritable(status)
  const { error: deleteError } = await supabase
    .from('tournament_players')
    .delete()
    .eq('tournament_id', tournamentId)
  if (deleteError) throw mapSupabaseError(deleteError)
  await insertRosterRows(tournamentId, playerIds)
}

function sortPlayersByName(players: Player[]): Player[] {
  return [...players].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
}

export async function listTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function getTournament(id: Uuid): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw mapSupabaseError(error)
  return data
}

export async function listTournamentRoster(tournamentId: Uuid): Promise<Player[]> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select('player_id, players(*)')
    .eq('tournament_id', tournamentId)
  if (error) throw mapSupabaseError(error)
  const players: Player[] = []
  for (const row of data ?? []) {
    const embedded = row.players
    if (
      embedded &&
      typeof embedded === 'object' &&
      !Array.isArray(embedded) &&
      'id' in embedded
    ) {
      players.push(embedded as Player)
    }
  }
  return sortPlayersByName(players)
}

export async function getTournamentWithRoster(
  id: Uuid,
): Promise<TournamentWithRoster> {
  const { data, error } = await supabase
    .from('tournaments')
    .select(
      `
      *,
      tournament_players (
        player_id,
        players (*)
      )
    `,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw mapSupabaseError(error)
  if (!data) {
    throw new DomainError('NOT_FOUND', 'Campeonato não encontrado.')
  }

  const { tournament_players, ...tournament } = data as Tournament & {
    tournament_players: {
      player_id: Uuid
      players: Player | Player[] | null
    }[]
  }

  const players: Player[] = []
  for (const row of tournament_players ?? []) {
    const embedded = row.players
    if (
      embedded &&
      typeof embedded === 'object' &&
      !Array.isArray(embedded) &&
      'id' in embedded
    ) {
      players.push(embedded)
    }
  }

  return { ...tournament, players: sortPlayersByName(players) }
}

export async function createTournament(
  input: CreateTournamentInput,
  isAdmin: boolean,
): Promise<Tournament> {
  assertAdmin(isAdmin)
  const { title, game_name } = validateTitleFields(input.title, input.game_name)
  if (!input.game_image_url) {
    throw new DomainError('VALIDATION', 'Envie a imagem de capa do jogo.')
  }
  const players_per_match = asPlayersPerMatch(input.players_per_match)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      title,
      game_name,
      game_image_url: input.game_image_url,
      players_per_match,
    })
    .select()
    .single()
  if (error) throw mapSupabaseError(error)

  try {
    await insertRosterRows(tournament.id, input.playerIds)
  } catch (rosterError) {
    // compensation: delete tournament if roster insert fails
    await supabase.from('tournaments').delete().eq('id', tournament.id)
    if (rosterError instanceof DomainError) {
      if (rosterError.code === 'VALIDATION') {
        throw new DomainError(
          'VALIDATION',
          'Não foi possível vincular um ou mais jogadores ao campeonato.',
        )
      }
      throw rosterError
    }
    throw rosterError
  }

  return tournament
}

export async function updateTournament(
  input: UpdateTournamentInput,
  isAdmin: boolean,
): Promise<Tournament> {
  assertAdmin(isAdmin)
  const existing = await getTournament(input.id)
  if (!isDraft(existing.status)) {
    throw new DomainError(
      'TOURNAMENT_NOT_DRAFT',
      'Só é possível editar campeonatos em rascunho.',
    )
  }
  const { title, game_name } = validateTitleFields(input.title, input.game_name)
  if (!input.game_image_url) {
    throw new DomainError('VALIDATION', 'Envie a imagem de capa do jogo.')
  }
  const players_per_match = asPlayersPerMatch(input.players_per_match)

  const { data, error } = await supabase
    .from('tournaments')
    .update({
      title,
      game_name,
      game_image_url: input.game_image_url,
      players_per_match,
    })
    .eq('id', input.id)
    .select()
    .single()
  if (error) throw mapSupabaseError(error)

  await replaceRoster(input.id, input.playerIds, existing.status)
  return data
}

export async function deleteTournament(id: Uuid, isAdmin: boolean): Promise<void> {
  assertAdmin(isAdmin)
  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) throw mapSupabaseError(error)
}
