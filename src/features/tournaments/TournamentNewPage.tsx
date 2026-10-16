import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RequireAdmin } from '@/features/auth/RequireAdmin'
import { useAuth } from '@/features/auth/auth-context'
import { ModalityRadioGroup } from '@/features/tournaments/ModalityRadioGroup'
import { RosterPicker } from '@/features/tournaments/RosterPicker'
import { uploadGameCover } from '@/features/tournaments/game-cover'
import {
  createTournament,
  tournamentsQueryKeys,
} from '@/features/tournaments/tournaments-api'
import type { PlayersPerMatch, Uuid } from '@/types/domain'
import { DomainError } from '@/types/errors'

const TOURNAMENT_NEW_FORM_ID = 'tournament-new-form'

function TournamentNewForm() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [gameName, setGameName] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [playersPerMatch, setPlayersPerMatch] = useState<PlayersPerMatch>(4)
  const [selectedIds, setSelectedIds] = useState<Set<Uuid>>(new Set())

  const mutation = useMutation({
    mutationFn: async () => {
      if (!coverFile) {
        throw new DomainError('VALIDATION', 'Envie a imagem de capa do jogo.')
      }
      const game_image_url = await uploadGameCover(coverFile)
      return createTournament(
        {
          title,
          game_name: gameName,
          game_image_url,
          players_per_match: playersPerMatch,
          playerIds: [...selectedIds],
        },
        isAdmin,
      )
    },
    onSuccess: (tournament) => {
      toast.success('Campeonato criado.')
      void queryClient.invalidateQueries({ queryKey: tournamentsQueryKeys.all })
      navigate(`/tournaments/${tournament.id}`, { replace: true })
    },
    onError: (err) => {
      const message =
        err instanceof DomainError ? err.message : 'Algo deu errado.'
      toast.error(message)
    },
  })

  function handleCoverChange(file: File | null) {
    setCoverFile(file)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(file ? URL.createObjectURL(file) : null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <main className="mx-auto px-4 py-6 max-w-6xl container">
      <PageHeader
        title="Novo campeonato"
        description="Metadados, capa e elenco inicial (rascunho)."
      />

      <div className="flex flex-col gap-6 mx-auto max-w-xl">
        <form
          id={TOURNAMENT_NEW_FORM_ID}
          className="flex flex-col gap-6"
          onSubmit={handleSubmit}
        >
        <div className="flex flex-col gap-2">
          <Label htmlFor="tournament-title">Título</Label>
          <Input
            id="tournament-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={mutation.isPending}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="game-name">Nome do jogo</Label>
          <Input
            id="game-name"
            required
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            disabled={mutation.isPending}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="game-cover">Capa do jogo</Label>
          {coverPreview ? (
            <div className="border border-border rounded-lg aspect-video overflow-hidden">
              <img
                src={coverPreview}
                alt=""
                className="size-full object-cover"
              />
            </div>
          ) : null}
          <Input
            id="game-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={mutation.isPending}
            onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-muted-foreground text-xs">
            JPG, PNG ou WebP, até 5 MB. Obrigatório.
          </p>
        </div>

        <ModalityRadioGroup
          value={playersPerMatch}
          onChange={setPlayersPerMatch}
          rosterCount={selectedIds.size}
          disabled={mutation.isPending}
        />
        </form>

        <RosterPicker
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          disabled={mutation.isPending}
        />

        <div className="flex flex-wrap gap-2">
          <Link
            to="/tournaments"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'min-h-10',
              mutation.isPending && 'pointer-events-none opacity-50',
            )}
            aria-disabled={mutation.isPending}
          >
            Cancelar
          </Link>
          <Button
            type="submit"
            form={TOURNAMENT_NEW_FORM_ID}
            className="min-h-10"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Salvando…' : 'Criar campeonato'}
          </Button>
        </div>
      </div>
    </main>
  )
}

export function TournamentNewPage() {
  return (
    <RequireAdmin>
      <TournamentNewForm />
    </RequireAdmin>
  )
}
