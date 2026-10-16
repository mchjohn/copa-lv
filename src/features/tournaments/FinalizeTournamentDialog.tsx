import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/auth-context'
import { leaderboardQueryKeys } from '@/features/tournaments/matches-api'
import { finalizeTournament } from '@/features/tournaments/finalize-tournament'
import { tournamentsQueryKeys } from '@/features/tournaments/tournaments-api'
import type { Uuid } from '@/types/domain'
import { DomainError } from '@/types/errors'

interface FinalizeTournamentDialogProps {
  tournamentId: Uuid
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FinalizeTournamentDialog({
  tournamentId,
  title,
  open,
  onOpenChange,
}: FinalizeTournamentDialogProps) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => finalizeTournament(tournamentId, isAdmin),
    onSuccess: () => {
      toast.success('Campeonato finalizado.')
      void queryClient.invalidateQueries({
        queryKey: tournamentsQueryKeys.detail(tournamentId),
      })
      void queryClient.invalidateQueries({
        queryKey: leaderboardQueryKeys.byTournament(tournamentId),
      })
      onOpenChange(false)
    },
    onError: (err) => {
      const message =
        err instanceof DomainError ? err.message : 'Algo deu errado.'
      toast.error(message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar campeonato</DialogTitle>
          <DialogDescription>
            Encerrar &quot;{title}&quot;? Os resultados não poderão mais ser
            editados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Finalizando…' : 'Finalizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
