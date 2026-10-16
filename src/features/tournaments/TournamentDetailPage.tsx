import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { TournamentStatusBadge } from '@/components/status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { PlayerAvatar } from '@/features/players/PlayerAvatar'
import { canGenerateKeys, minPlayersForKeys } from '@/domain/round-robin'
import { DeleteTournamentDialog } from '@/features/tournaments/DeleteTournamentDialog'
import { StartTournamentDialog } from '@/features/tournaments/StartTournamentDialog'
import { LeaderboardTable } from '@/features/leaderboard/LeaderboardTable'
import { useLeaderboard } from '@/features/leaderboard/use-leaderboard'
import { TournamentMatchesSection } from '@/features/tournaments/TournamentMatchesSection'
import { modalityBadgeLabel } from '@/features/tournaments/tournament-labels'
import {
  getTournamentWithRoster,
  tournamentsQueryKeys,
} from '@/features/tournaments/tournaments-api'
import type { Uuid } from '@/types/domain'
import { asPlayersPerMatch, isDraft, isInProgress, isCompleted } from '@/types/domain'

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const tournamentId = id as Uuid
  const { isAdmin } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: tournamentsQueryKeys.detail(tournamentId),
    queryFn: () => getTournamentWithRoster(tournamentId),
    enabled: Boolean(id),
  })

  const showRankedLeaderboard =
    data != null && (isInProgress(data.status) || isCompleted(data.status))

  const leaderboard = useLeaderboard(tournamentId, showRankedLeaderboard)

  if (!id) {
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
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
            <Link
              to="/tournaments"
              className={buttonVariants({ variant: 'outline' })}
            >
              Voltar à lista
            </Link>
          </div>
        </EmptyState>
      </main>
    )
  }

  const showDraftAdminActions = isAdmin && isDraft(data.status)
  const k = asPlayersPerMatch(data.players_per_match)
  const n = data.players.length
  const keysReady = canGenerateKeys(n, k)
  const minPlayers = minPlayersForKeys(k)

  return (
    <main className="mx-auto px-4 py-6 max-w-6xl container">
      <div className="mb-6 border border-border rounded-xl overflow-hidden">
        <div className="bg-muted w-full max-h-72 sm:max-h-80 aspect-video">
          <img
            src={data.game_image_url}
            alt=""
            className="size-full object-cover"
          />
        </div>
      </div>

      <PageHeader
        title={data.title}
        description={data.game_name}
        actions={
          showDraftAdminActions ? (
            <>
              <Link
                to={`/tournaments/${data.id}/edit`}
                className={cn(buttonVariants({ variant: 'outline' }), 'min-h-10')}
              >
                Editar
              </Link>
              <Button
                type="button"
                variant="destructive"
                className="min-h-10"
                onClick={() => setDeleteOpen(true)}
              >
                Excluir
              </Button>
            </>
          ) : isAdmin ? (
            <Button
              type="button"
              variant="destructive"
              className="min-h-10"
              onClick={() => setDeleteOpen(true)}
            >
              Excluir
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <TournamentStatusBadge status={data.status} />
        <Badge variant="secondary">
          {modalityBadgeLabel(data.players_per_match)}
        </Badge>
      </div>

      {isDraft(data.status) ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-semibold text-lg">Elenco</h2>
          {data.players.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum jogador no elenco ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.players.map((player) => (
                <li key={player.id}>
                  <Card className="py-0">
                    <CardContent className="flex items-center gap-3 p-3">
                      <PlayerAvatar
                        name={player.name}
                        avatarUrl={player.avatar_url}
                      />
                      <span className="font-medium">{player.name}</span>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {isAdmin ? (
            <div className="flex flex-col items-start gap-1">
              <Button
                type="button"
                className="w-full sm:w-auto min-h-10"
                disabled={!keysReady}
                title={
                  keysReady
                    ? undefined
                    : `Inclua pelo menos ${minPlayers} jogadores.`
                }
                onClick={() => setStartOpen(true)}
              >
                Gerar Chaves e Iniciar Torneio
              </Button>
              {!keysReady ? (
                <p className="text-muted-foreground text-sm">
                  Inclua pelo menos {minPlayers} jogadores.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {showRankedLeaderboard ? (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_360px]">
          {isCompleted(data.status) ? (
            <p className="order-1 lg:col-span-2 text-muted-foreground text-sm">
              Pódio e resultados finais — spec 10.
            </p>
          ) : null}

          <section className="flex flex-col gap-4 order-2 lg:order-1">
            <h2 className="font-semibold text-lg">Partidas</h2>
            <TournamentMatchesSection
              tournamentId={data.id}
              canEditResults={isInProgress(data.status)}
            />
          </section>

          <section className="flex flex-col gap-4 order-1 lg:order-2">
            <h2 className="font-semibold text-lg">Classificação</h2>
            <LeaderboardTable
              rows={leaderboard.data ?? []}
              isLoading={leaderboard.isLoading}
              isError={leaderboard.isError}
            />
          </section>
        </div>
      ) : null}

      <StartTournamentDialog
        tournamentId={data.id}
        playerCount={n}
        open={startOpen}
        onOpenChange={setStartOpen}
      />

      <DeleteTournamentDialog
        tournament={data}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </main>
  )
}
