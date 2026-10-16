import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerAvatar } from '@/features/players/PlayerAvatar'
import {
  groupMatchesByRound,
  listTournamentMatches,
  matchesQueryKeys,
} from '@/features/tournaments/matches-api'
import type { Uuid } from '@/types/domain'

interface TournamentMatchesSectionProps {
  tournamentId: Uuid
}

export function TournamentMatchesSection({
  tournamentId,
}: TournamentMatchesSectionProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: matchesQueryKeys.byTournament(tournamentId),
    queryFn: () => listTournamentMatches(tournamentId),
  })

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

  return (
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
                        </li>
                      ))}
                    </ul>
                    <Badge variant="secondary">
                      {card.match.status === 'pending'
                        ? 'Pendente'
                        : 'Concluída'}
                    </Badge>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
