import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MatchStatus, TournamentStatus } from '@/types/domain'
import { tournamentStatusLabel } from '@/features/tournaments/tournament-labels'

export function TournamentStatusBadge({
  status,
  className,
}: {
  status: TournamentStatus
  className?: string
}) {
  if (status === 'draft') {
    return (
      <Badge
        variant="outline"
        className={cn('border-slate-500/60 text-slate-300', className)}
      >
        {tournamentStatusLabel(status)}
      </Badge>
    )
  }
  if (status === 'in_progress') {
    return (
      <Badge
        className={cn(
          'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
          className,
        )}
      >
        {tournamentStatusLabel(status)}
      </Badge>
    )
  }
  return (
    <Badge
      className={cn(
        'bg-purple-500/15 border-purple-500/40 text-purple-300',
        className,
      )}
    >
      {tournamentStatusLabel(status)}
    </Badge>
  )
}

export function MatchStatusBadge({
  status,
  className,
}: {
  status: MatchStatus
  className?: string
}) {
  if (status === 'pending') {
    return (
      <Badge
        className={cn(
          'bg-amber-500/15 border-amber-500/40 text-amber-200',
          className,
        )}
      >
        Pendente
      </Badge>
    )
  }
  return (
    <Badge
      className={cn(
        'bg-success/15 border-success/40 text-success',
        className,
      )}
    >
      Concluído
    </Badge>
  )
}