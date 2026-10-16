import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { PlayerAvatar } from '@/features/players/PlayerAvatar'
import { MatchResultDialog } from '@/features/tournaments/MatchResultDialog'
import { groupMatchesByRound, type MatchCard } from '@/features/tournaments/matches-api'
import { placementWithPoints } from '@/features/tournaments/placement-label'
import type { Uuid } from '@/types/domain'

interface TournamentMatchesSectionProps {
  tournamentId: Uuid
  canEditResults: boolean
  matchCards: MatchCard[] | undefined
  isLoading: boolean
  isError: boolean
}

export function TournamentMatchesSection({
  tournamentId,
  canEditResults,
  matchCards: data,
  isLoading,
  isError,
}: TournamentMatchesSectionProps) {
  const { isAdmin } = useAuth()
  const [dialogCard, setDialogCard] = useState<MatchCard | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openResultDialog(card: MatchCard) {
    setDialogCard(card)
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Carregando partidas…</p>
    )
  }

  if (isError || !data) {
    return (
      <p className="text-muted-foreground text-sm">
        Não foi possível carregar as partidas.
      </p>
    )
  }

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Nenhuma partida gerada.</p>
    )
  }

  const byRound = groupMatchesByRound(data)
  const rounds = [...byRound.keys()].sort((a, b) => a - b)
  const showAdminActions = isAdmin && canEditResults

  return (
    <>
      <div className="flex flex-col gap-6">
        {rounds.map((round) => (
          <section key={round} className="flex flex-col gap-3">
            <h2 className="font-semibold text-lg">Rodada {round}</h2>
            <ul className="flex flex-col gap-2">
              {(byRound.get(round) ?? []).map((card) => (
                <li key={card.match.id}>
                  <Card className="py-0">
                    <CardContent className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3 p-3">
                      <ul className="flex flex-col flex-1 gap-2">
                        {card.players.map((player) => (
                          <li
                            key={player.playerId}
                            className="flex items-center gap-2"
                          >
                            <PlayerAvatar
                              name={player.name}
                              avatarUrl={player.avatar_url}
                            />
                            <span className="font-medium">{player.name}</span>
                            {card.match.status === 'completed' &&
                            player.placement != null &&
                            player.points_earned != null ? (
                              <span className="text-muted-foreground text-sm">
                                {placementWithPoints(
                                  player.placement,
                                  player.points_earned,
                                )}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-col items-stretch sm:items-end gap-2">
                        {card.match.status === 'pending' ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 dark:bg-amber-950/50 border-transparent text-amber-950 dark:text-amber-100"
                          >
                            Pendente
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-[#22c55e]/15 border-transparent text-[#15803d] dark:text-[#4ade80]"
                          >
                            Concluído
                          </Badge>
                        )}
                        {showAdminActions ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10"
                            onClick={() => openResultDialog(card)}
                          >
                            {card.match.status === 'pending'
                              ? 'Lançar resultado'
                              : 'Editar resultado'}
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <MatchResultDialog
        tournamentId={tournamentId}
        card={dialogCard}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setDialogCard(null)
        }}
      />
    </>
  )
}
