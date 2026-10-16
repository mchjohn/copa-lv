import { useQuery } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { CreatePlayerDialog } from '@/features/players/CreatePlayerDialog'
import { DeletePlayerDialog } from '@/features/players/DeletePlayerDialog'
import { EditPlayerDialog } from '@/features/players/EditPlayerDialog'
import { PlayerAvatar } from '@/features/players/PlayerAvatar'
import { listPlayers, playersQueryKeys } from '@/features/players/players-api'
import type { Player } from '@/types/domain'

export function PlayersPage() {
  const { isAdmin } = useAuth()
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: players = [], isLoading, isError, refetch } = useQuery({
    queryKey: playersQueryKeys.all,
    queryFn: listPlayers,
  })

  return (
    <main className="mx-auto px-4 py-6 max-w-6xl container">
      <PageHeader
        title="Jogadores"
        description="Banco global de participantes dos campeonatos."
        actions={
          isAdmin ? (
            <Button
              type="button"
              className="min-h-10"
              onClick={() => setCreateOpen(true)}
            >
              Novo jogador
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando jogadores…</p>
      ) : isError ? (
        <EmptyState>
          <p className="mb-3">Falha ao carregar.</p>
          <Button type="button" variant="outline" className="min-h-10" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </EmptyState>
      ) : players.length === 0 ? (
        <EmptyState>
          <p className="mb-3">Nenhum jogador cadastrado ainda.</p>
          {isAdmin ? (
            <Button
              type="button"
              className="min-h-10"
              onClick={() => setCreateOpen(true)}
            >
              Novo jogador
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {players.map((player, index) => (
            <li key={player.id}>
              <Card className="py-0">
                <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                  <span
                    className="text-muted-foreground w-7 shrink-0 text-right text-sm tabular-nums"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <PlayerAvatar
                    name={player.name}
                    avatarUrl={player.avatar_url}
                  />
                  <span className="flex-1 min-w-0 font-medium truncate">
                    {player.name}
                  </span>
                  {isAdmin ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        aria-label={`Editar ${player.name}`}
                        onClick={() => setEditingPlayer(player)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 text-destructive hover:text-destructive"
                        aria-label={`Excluir ${player.name}`}
                        onClick={() => setDeletingPlayer(player)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <CreatePlayerDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditPlayerDialog
        player={editingPlayer}
        open={editingPlayer !== null}
        onOpenChange={(open) => {
          if (!open) setEditingPlayer(null)
        }}
      />
      <DeletePlayerDialog
        player={deletingPlayer}
        open={deletingPlayer !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingPlayer(null)
        }}
      />
    </main>
  )
}
