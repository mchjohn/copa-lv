import { mapSupabaseError } from '@/lib/map-supabase-error'
import { supabase } from '@/lib/supabase'
import type { Match, MatchPhase, Uuid } from '@/types/domain'

export const matchesQueryKeys = {
  byTournament: (tournamentId: Uuid) => ['matches', tournamentId] as const,
  detail: (matchId: Uuid) => ['match', matchId] as const,
}

export const leaderboardQueryKeys = {
  byTournament: (tournamentId: Uuid) => ['leaderboard', tournamentId] as const,
}

export interface MatchCardPlayer {
  playerId: Uuid
  name: string
  avatar_url: string
  placement: number | null
  points_earned: number | null
}

export interface MatchCard {
  match: Match
  players: MatchCardPlayer[]
}

type MatchPlayerRow = {
  player_id: Uuid
  placement: number | null
  points_earned: number | null
  players:
    | { id: Uuid; name: string; avatar_url: string }
    | { id: Uuid; name: string; avatar_url: string }[]
    | null
}

type MatchRow = Omit<Match, 'phase'> & {
  phase?: MatchPhase | null
  match_players: MatchPlayerRow[] | null
}

function embeddedPlayer(
  embedded: MatchPlayerRow['players'],
): { id: Uuid; name: string; avatar_url: string } | null {
  if (!embedded || Array.isArray(embedded)) return null
  if ('id' in embedded && 'name' in embedded) return embedded
  return null
}

function sortMatchPlayers(
  players: MatchCardPlayer[],
  status: Match['status'],
): MatchCardPlayer[] {
  const copy = [...players]
  if (status === 'completed') {
    copy.sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0))
  } else {
    copy.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
  }
  return copy
}

export async function listTournamentMatches(
  tournamentId: Uuid,
): Promise<MatchCard[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      *,
      match_players (
        player_id,
        placement,
        points_earned,
        players ( id, name, avatar_url )
      )
    `,
    )
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw mapSupabaseError(error)

  const rows = (data ?? []) as MatchRow[]
  return rows.map((row) => {
    const { match_players, phase: rowPhase, ...matchRest } = row
    const players: MatchCardPlayer[] = []
    for (const mp of match_players ?? []) {
      const player = embeddedPlayer(mp.players)
      if (!player) continue
      players.push({
        playerId: mp.player_id,
        name: player.name,
        avatar_url: player.avatar_url,
        placement: mp.placement,
        points_earned: mp.points_earned,
      })
    }
    const phase: MatchPhase = rowPhase === 'final' ? 'final' : 'qualifying'
    const match: Match = { ...matchRest, phase }

    return {
      match,
      players: sortMatchPlayers(players, match.status),
    }
  })
}

export function groupMatchesByRound(
  cards: readonly MatchCard[],
): Map<number, MatchCard[]> {
  const map = new Map<number, MatchCard[]>()
  for (const card of cards) {
    const round = card.match.round_number
    const list = map.get(round) ?? []
    list.push(card)
    map.set(round, list)
  }
  return map
}
