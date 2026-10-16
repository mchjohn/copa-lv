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
import {
  leaderboardQueryKeys,
  matchesQueryKeys,
} from '@/features/tournaments/matches-api'
import { startTournament } from '@/features/tournaments/start-tournament'
import { tournamentsQueryKeys } from '@/features/tournaments/tournaments-api'
import type { Uuid } from '@/types/domain'
import { DomainError } from '@/types/errors'

interface StartTournamentDialogProps {
  tournamentId: Uuid
  playerCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StartTournamentDialog({
  tournamentId,
  playerCount,
  open,
  onOpenChange,
}: StartTournamentDialogProps) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => startTournament(tournamentId, isAdmin),
    onSuccess: async () => {
      toast.success('Chaves geradas. Campeonato iniciado.')
      await queryClient.invalidateQueries({
        queryKey: tournamentsQueryKeys.detail(tournamentId),
      })
      await queryClient.invalidateQueries({
        queryKey: matchesQueryKeys.byTournament(tournamentId),
      })
      await queryClient.invalidateQueries({
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
          <DialogTitle>Gerar chaves e iniciar torneio</DialogTitle>
          <DialogDescription>
            Gerar chaves para {playerCount} jogadores? O elenco será congelado.
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
            {mutation.isPending ? 'Gerando…' : 'Gerar chaves'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
