import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/empty-state'
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
  getTournamentWithRoster,
  tournamentsQueryKeys,
  updateTournament,
  type TournamentWithRoster,
} from '@/features/tournaments/tournaments-api'
import type { PlayersPerMatch, Uuid } from '@/types/domain'
import { isDraft } from '@/types/domain'
import { DomainError } from '@/types/errors'

function TournamentEditForm({
  tournament,
}: {
  tournament: TournamentWithRoster
}) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState(tournament.title)
  const [gameName, setGameName] = useState(tournament.game_name)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [existingCoverUrl] = useState(tournament.game_image_url)
  const [playersPerMatch, setPlayersPerMatch] = useState<PlayersPerMatch>(
    tournament.players_per_match,
  )
  const [selectedIds, setSelectedIds] = useState<Set<Uuid>>(
    () => new Set(tournament.players.map((p) => p.id)),
  )

  const mutation = useMutation({
    mutationFn: async () => {
      let game_image_url = existingCoverUrl
      if (coverFile) {
        game_image_url = await uploadGameCover(coverFile)
      }
      return updateTournament(
        {
          id: tournament.id,
          title,
          game_name: gameName,
          game_image_url,
          players_per_match: playersPerMatch,
          playerIds: [...selectedIds],
        },
        isAdmin,
      )
    },
    onSuccess: () => {
      toast.success('Campeonato atualizado.')
      void queryClient.invalidateQueries({ queryKey: tournamentsQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: tournamentsQueryKeys.detail(tournament.id),
      })
      void queryClient.invalidateQueries({
        queryKey: tournamentsQueryKeys.roster(tournament.id),
      })
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

  const coverSrc = coverPreview ?? existingCoverUrl

  return (
    <main className="mx-auto px-4 py-6 max-w-6xl container">
      <PageHeader
        title="Editar campeonato"
        description="Rascunho — metadados e elenco."
      />

      <form
        className="flex flex-col gap-6 mx-auto max-w-xl"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-tournament-title">Título</Label>
          <Input
            id="edit-tournament-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={mutation.isPending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-game-name">Nome do jogo</Label>
          <Input
            id="edit-game-name"
            required
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            disabled={mutation.isPending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-game-cover">Capa do jogo</Label>
          {coverSrc ? (
            <div className="border border-border rounded-lg aspect-video overflow-hidden">
              <img src={coverSrc} alt="" className="size-full object-cover" />
            </div>
          ) : null}
          <Input
            id="edit-game-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={mutation.isPending}
            onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-muted-foreground text-xs">
            Envie uma nova imagem para substituir a capa atual.
          </p>
        </div>

        <ModalityRadioGroup
          value={playersPerMatch}
          onChange={setPlayersPerMatch}
          disabled={mutation.isPending}
        />

        <RosterPicker
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          disabled={mutation.isPending}
        />

        <div className="flex flex-wrap gap-2">
          <Link
            to={`/tournaments/${tournament.id}`}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'min-h-10',
              mutation.isPending && 'pointer-events-none opacity-50',
            )}
            aria-disabled={mutation.isPending}
          >
            Cancelar
          </Link>
          <Button type="submit" className="min-h-10" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </main>
  )
}

function TournamentEditLoader() {
  const { id } = useParams<{ id: string }>()
  const tournamentId = id as Uuid

  const { data, isLoading, isError } = useQuery({
    queryKey: tournamentsQueryKeys.detail(tournamentId),
    queryFn: () => getTournamentWithRoster(tournamentId),
    enabled: Boolean(id),
  })

  if (!id) {
    return <Navigate to="/tournaments" replace />
  }

  if (isLoading) {
    return (
      <main className="mx-auto px-4 py-6 max-w-6xl container">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </main>
    )
  }

  if (isError || !data) {
    return (
      <main className="mx-auto px-4 py-6 max-w-6xl container">
        <EmptyState>
          <p className="mb-3">Campeonato não encontrado.</p>
          <Link
            to="/tournaments"
            className={buttonVariants({ variant: 'outline' })}
          >
            Voltar à lista
          </Link>
        </EmptyState>
      </main>
    )
  }

  if (!isDraft(data.status)) {
    return <Navigate to={`/tournaments/${tournamentId}`} replace />
  }

  return <TournamentEditForm key={data.id} tournament={data} />
}

export function TournamentEditPage() {
  return (
    <RequireAdmin>
      <TournamentEditLoader />
    </RequireAdmin>
  )
}
