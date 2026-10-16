import { assertValidPlacements } from '@/domain/match-placements'
import { pointsForPlacement } from '@/domain/points'
import { assertAdmin } from '@/features/auth/assert-admin'
import { mapSupabaseError } from '@/lib/map-supabase-error'
import { supabase } from '@/lib/supabase'
import type { SaveMatchResultInput, TournamentStatus, Uuid } from '@/types/domain'
import { asPlayersPerMatch, isInProgress } from '@/types/domain'
import { DomainError } from '@/types/errors'

type MatchSize = 2 | 3 | 4

function asMatchSize(n: number): MatchSize {
  if (n === 2 || n === 3 || n === 4) return n
  throw new DomainError('VALIDATION', 'Número de jogadores inválido na partida.')
}

type LoadedMatch = {
  id: Uuid
  tournament_id: Uuid
  tournaments: { players_per_match: number; status: TournamentStatus } | null
  match_players: { player_id: Uuid }[] | null
}

export async function saveMatchResult(
  input: SaveMatchResultInput,
  isAdmin: boolean,
): Promise<void> {
  assertAdmin(isAdmin)

  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      *,
      tournaments ( players_per_match, status ),
      match_players ( player_id )
    `,
    )
    .eq('id', input.matchId)
    .maybeSingle()
  if (error) throw mapSupabaseError(error)

  const row = data as LoadedMatch | null
  if (!row?.tournaments) {
    throw new DomainError('NOT_FOUND', 'Partida não encontrada.')
  }

  const tournament = row.tournaments
  if (!isInProgress(tournament.status)) {
    throw new DomainError(
      'MATCH_NOT_EDITABLE',
      'Resultados só podem ser lançados enquanto o campeonato está em andamento.',
    )
  }

  const playerIds = (row.match_players ?? []).map((mp) => mp.player_id)
  const matchSize = asMatchSize(playerIds.length)
  const tournamentK = asPlayersPerMatch(tournament.players_per_match)

  assertValidPlacements(playerIds, input.placements)

  for (const { playerId, placement } of input.placements) {
    const points = pointsForPlacement({
      tournamentK,
      matchSize,
      placement,
    })
    const { error: updateError } = await supabase
      .from('match_players')
      .update({ placement, points_earned: points })
      .eq('match_id', input.matchId)
      .eq('player_id', playerId)
    if (updateError) throw mapSupabaseError(updateError)
  }

  const { error: matchError } = await supabase
    .from('matches')
    .update({ status: 'completed' })
    .eq('id', input.matchId)
  if (matchError) throw mapSupabaseError(matchError)
}
