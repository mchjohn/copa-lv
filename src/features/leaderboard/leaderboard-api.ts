import { mapSupabaseError } from '@/lib/map-supabase-error'
import { supabase } from '@/lib/supabase'
import type { LeaderboardRow, Uuid } from '@/types/domain'

function toLeaderboardRow(raw: Record<string, unknown>): LeaderboardRow {
  return {
    tournament_id: String(raw.tournament_id) as Uuid,
    player_id: String(raw.player_id) as Uuid,
    player_name: String(raw.player_name),
    player_avatar: String(raw.player_avatar),
    matches_played: Number(raw.matches_played),
    total_wins: Number(raw.total_wins),
    total_points: Number(raw.total_points),
  }
}

export async function fetchLeaderboard(
  tournamentId: Uuid,
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from('view_leaderboard')
    .select('*')
    .eq('tournament_id', tournamentId)
  if (error) throw mapSupabaseError(error)
  return (data ?? []).map((row) =>
    toLeaderboardRow(row as Record<string, unknown>),
  )
}
