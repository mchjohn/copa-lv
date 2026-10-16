import { canFinalize } from '@/domain/finalize-podium'
import { assertAdmin } from '@/features/auth/assert-admin'
import { mapSupabaseError } from '@/lib/map-supabase-error'
import { supabase } from '@/lib/supabase'
import type { Uuid } from '@/types/domain'
import { isInProgress } from '@/types/domain'
import { DomainError } from '@/types/errors'

export async function finalizeTournament(
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
  if (!isInProgress(tournament.status)) {
    throw new DomainError(
      'VALIDATION',
      'Só é possível finalizar um campeonato em andamento.',
    )
  }

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('status')
    .eq('tournament_id', tournamentId)
  if (matchesError) throw mapSupabaseError(matchesError)

  if (!canFinalize(matches ?? [])) {
    throw new DomainError(
      'TOURNAMENT_NOT_COMPLETABLE',
      'Finalize somente quando todas as partidas tiverem resultado.',
    )
  }

  const { data: updated, error: statusError } = await supabase
    .from('tournaments')
    .update({ status: 'completed' })
    .eq('id', tournamentId)
    .eq('status', 'in_progress')
    .select('id')
  if (statusError) throw mapSupabaseError(statusError)
  if (!updated?.length) {
    throw new DomainError(
      'VALIDATION',
      'Só é possível finalizar um campeonato em andamento.',
    )
  }
}
