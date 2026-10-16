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
  playersQueryKeys,
  updatePlayer,
  type UpdatePlayerInput,
} from '@/features/players/players-api'
import type { Player } from '@/types/domain'
import { DomainError } from '@/types/errors'

interface EditPlayerDialogProps {
  player: Player | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EditPlayerForm({
  player,
  onClose,
}: {
  player: Player
  onClose: () => void
}) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState(player.name)
  const [file, setFile] = useState<File | null>(null)
  const [replaceAvatar, setReplaceAvatar] = useState(false)

  const mutation = useMutation({
    mutationFn: (input: UpdatePlayerInput) =>
      updatePlayer(input, isAdmin, player),
    onSuccess: () => {
      toast.success('Jogador atualizado.')
      void queryClient.invalidateQueries({ queryKey: playersQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: playersQueryKeys.detail(player.id),
      })
      onClose()
    },
    onError: (err) => {
      const message =
        err instanceof DomainError ? err.message : 'Algo deu errado.'
      toast.error(message)
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate({
      id: player.id,
      name,
      file,
      replaceAvatar,
    })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-4">
        <PlayerAvatarPreview
          name={name}
          file={file}
          fallbackUrl={
            replaceAvatar && !file ? undefined : player.avatar_url
          }
        />
        <div className="flex flex-col flex-1 gap-2 min-w-0">
          <Label htmlFor="edit-player-name">Nome</Label>
          <Input
            id="edit-player-name"
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="border-border rounded size-4"
            checked={replaceAvatar}
            onChange={(e) => {
              setReplaceAvatar(e.target.checked)
              if (!e.target.checked) setFile(null)
            }}
            disabled={mutation.isPending}
          />
          Substituir avatar
        </label>
        {replaceAvatar ? (
          <>
            <Input
              id="edit-player-avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={mutation.isPending}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-muted-foreground text-xs">
              Sem arquivo, o avatar gerado será usado.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-xs">
            Avatares gerados atualizam ao mudar o nome; fotos enviadas
            permanecem.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EditPlayerDialog({
  player,
  open,
  onOpenChange,
}: EditPlayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar jogador</DialogTitle>
        </DialogHeader>
        {player ? (
          <EditPlayerForm
            key={player.id}
            player={player}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
