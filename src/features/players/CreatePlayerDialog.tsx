import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { PlayerAvatarPreview } from '@/features/players/PlayerAvatarPreview'
import {
  createPlayer,
  playersQueryKeys,
  type CreatePlayerInput,
} from '@/features/players/players-api'
import type { Player } from '@/types/domain'
import { DomainError } from '@/types/errors'

interface CreatePlayerDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: (player: Player) => void
}

export function CreatePlayerDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCreated,
}: CreatePlayerDialogProps) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setName('')
      setFile(null)
    }
  }

  const mutation = useMutation({
    mutationFn: (input: CreatePlayerInput) => createPlayer(input, isAdmin),
    onSuccess: (player) => {
      toast.success('Jogador cadastrado.')
      void queryClient.invalidateQueries({ queryKey: playersQueryKeys.all })
      onCreated?.(player)
      handleOpenChange(false)
    },
    onError: (err) => {
      const message =
        err instanceof DomainError ? err.message : 'Algo deu errado.'
      toast.error(message)
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate({ name, file })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo jogador</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-4">
            <PlayerAvatarPreview name={name} file={file} />
            <div className="flex flex-col flex-1 gap-2 min-w-0">
              <Label htmlFor="create-player-name">Nome</Label>
              <Input
                id="create-player-name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={mutation.isPending}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-player-avatar">Avatar (opcional)</Label>
            <Input
              id="create-player-avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={mutation.isPending}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-muted-foreground text-xs">
              JPG, PNG ou WebP, até 2 MB. Sem foto, usamos avatar gerado.
            </p>
          </div>
          <DialogFooter className="sm:justify-end bg-transparent p-0 border-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
