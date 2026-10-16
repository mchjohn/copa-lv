import {
  canGenerateKeys,
  generateBracket,
  NOT_ENOUGH_PLAYERS_MESSAGE,
} from '@/domain/round-robin'
import { assertAdmin } from '@/features/auth/assert-admin'
import { mapSupabaseError } from '@/lib/map-supabase-error'
import { supabase } from '@/lib/supabase'
import type { Uuid } from '@/types/domain'
import { asPlayersPerMatch, isDraft } from '@/types/domain'
import { DomainError } from '@/types/errors'

async function compensateFailedStart(tournamentId: Uuid): Promise<void> {
  await supabase.from('matches').delete().eq('tournament_id', tournamentId)
  await supabase
    .from('tournaments')
    .update({ status: 'draft' })
    .eq('id', tournamentId)
}

export async function startTournament(
  tournamentId: Uuid,
  isAdmin: boolean,
): Promise<void> {
  assertAdmin(isAdmin)

  const { data: tournament, error: loadError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle()
  if (loadError) throw mapSupabaseError(loadError)
  if (!tournament) {
    throw new DomainError('NOT_FOUND', 'Campeonato não encontrado.')
  }
  if (!isDraft(tournament.status)) {
    throw new DomainError(
      'TOURNAMENT_NOT_DRAFT',
      'Só é possível gerar chaves para campeonatos em rascunho.',
    )
  }

  const { data: rosterRows, error: rosterError } = await supabase
    .from('tournament_players')
    .select('player_id')
    .eq('tournament_id', tournamentId)
  if (rosterError) throw mapSupabaseError(rosterError)

  const playerIds = (rosterRows ?? []).map((row) => row.player_id as Uuid)
  const n = playerIds.length
  const k = asPlayersPerMatch(tournament.players_per_match)

  if (!canGenerateKeys(n, k)) {
    throw new DomainError('NOT_ENOUGH_PLAYERS', NOT_ENOUGH_PLAYERS_MESSAGE)
  }

  const bracket = generateBracket(playerIds, k)

  const { data: updated, error: statusError } = await supabase
    .from('tournaments')
    .update({ status: 'in_progress' })
    .eq('id', tournamentId)
    .eq('status', 'draft')
    .select('id')
  if (statusError) throw mapSupabaseError(statusError)
  if (!updated?.length) {
    throw new DomainError(
      'TOURNAMENT_NOT_DRAFT',
      'Só é possível gerar chaves para campeonatos em rascunho.',
    )
  }

  try {
    const matchRows = bracket.map((item) => ({
      tournament_id: tournamentId,
      round_number: item.roundNumber,
      phase: item.phase,
      status: 'pending' as const,
    }))
    const { data: insertedMatches, error: matchError } = await supabase
      .from('matches')
      .insert(matchRows)
      .select('id')
    if (matchError) throw mapSupabaseError(matchError)
    if (!insertedMatches || insertedMatches.length !== bracket.length) {
      throw new DomainError(
        'VALIDATION',
        'Não foi possível criar todas as partidas do campeonato.',
      )
    }

    const matchPlayerRows = bracket.flatMap((item, index) => {
      const match_id = insertedMatches[index].id as Uuid
      return item.playerIds.map((player_id) => ({
        match_id,
        player_id,
        placement: null,
        points_earned: null,
      }))
    })
    const { error: playersError } = await supabase
      .from('match_players')
      .insert(matchPlayerRows)
    if (playersError) throw mapSupabaseError(playersError)
  } catch (err) {
    await compensateFailedStart(tournamentId)
    throw err
  }
}
