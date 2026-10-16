import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
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
  deleteTournament,
  tournamentsQueryKeys,
} from '@/features/tournaments/tournaments-api'
import type { Tournament } from '@/types/domain'
import { DomainError } from '@/types/errors'

interface DeleteTournamentDialogProps {
  tournament: Tournament | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteTournamentDialog({
  tournament,
  open,
  onOpenChange,
}: DeleteTournamentDialogProps) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: (id: Tournament['id']) => deleteTournament(id, isAdmin),
    onSuccess: () => {
      toast.success('Campeonato excluído.')
      void queryClient.invalidateQueries({ queryKey: tournamentsQueryKeys.all })
      onOpenChange(false)
      navigate('/tournaments', { replace: true })
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
          <DialogTitle>
            Excluir &quot;{tournament?.title ?? 'campeonato'}&quot;?
          </DialogTitle>
          <DialogDescription>
            Partidas e resultados serão apagados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
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
            variant="destructive"
            disabled={!tournament || mutation.isPending}
            onClick={() => tournament && mutation.mutate(tournament.id)}
          >
            {mutation.isPending ? 'Excluindo…' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
