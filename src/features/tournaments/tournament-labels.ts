import type { PlayersPerMatch, TournamentStatus } from '@/types/domain'

export function modalityBadgeLabel(playersPerMatch: PlayersPerMatch): string {
  if (playersPerMatch === 2) return '1v1'
  if (playersPerMatch === 3) return '3 Players'
  return '4 Players'
}

export function tournamentStatusLabel(status: TournamentStatus): string {
  if (status === 'draft') return 'Rascunho'
  if (status === 'in_progress') return 'Em andamento'
  return 'Encerrado'
}

export type TournamentTabStatus = 'in_progress' | 'draft' | 'completed'

export const TOURNAMENT_TABS: {
  value: TournamentTabStatus
  label: string
}[] = [
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'completed', label: 'Encerrados' },
]
