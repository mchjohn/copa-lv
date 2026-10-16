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
import { deletePlayer, playersQueryKeys } from '@/features/players/players-api'
import type { Player } from '@/types/domain'
import { DomainError } from '@/types/errors'

interface DeletePlayerDialogProps {
  player: Player | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeletePlayerDialog({
  player,
  open,
  onOpenChange,
}: DeletePlayerDialogProps) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: Player['id']) => deletePlayer(id, isAdmin),
    onSuccess: () => {
      toast.success('Jogador excluído.')
      void queryClient.invalidateQueries({ queryKey: playersQueryKeys.all })
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
          <DialogTitle>
            Excluir {player?.name ?? 'jogador'}?
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
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
            variant="destructive"
            disabled={!player || mutation.isPending}
            onClick={() => player && mutation.mutate(player.id)}
          >
            {mutation.isPending ? 'Excluindo…' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
