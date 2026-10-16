import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { rankLeaderboard } from '@/domain/leaderboard'
import { fetchLeaderboard } from '@/features/leaderboard/leaderboard-api'
import {
  leaderboardQueryKeys,
  matchesQueryKeys,
} from '@/features/tournaments/matches-api'
import { supabase } from '@/lib/supabase'
import type { Uuid } from '@/types/domain'

export function useLeaderboard(tournamentId: Uuid, enabled = true) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: leaderboardQueryKeys.byTournament(tournamentId),
    queryFn: () => fetchLeaderboard(tournamentId),
    select: rankLeaderboard,
    enabled,
  })

  useEffect(() => {
    if (!enabled) return

    const refetch = () => {
      void queryClient.invalidateQueries({
        queryKey: leaderboardQueryKeys.byTournament(tournamentId),
      })
      void queryClient.invalidateQueries({
        queryKey: matchesQueryKeys.byTournament(tournamentId),
      })
    }

    const channel = supabase
      .channel(`leaderboard:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        refetch,
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Leaderboard realtime channel error:', err)
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tournamentId, enabled, queryClient])

  return query
}
