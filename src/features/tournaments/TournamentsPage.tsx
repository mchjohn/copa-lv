import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/auth-context'
import { TournamentCard } from '@/features/tournaments/TournamentCard'
import {
  TOURNAMENT_TABS,
  type TournamentTabStatus,
} from '@/features/tournaments/tournament-labels'
import {
  listTournaments,
  tournamentsQueryKeys,
} from '@/features/tournaments/tournaments-api'
import type { TournamentStatus } from '@/types/domain'

export function TournamentsPage() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<TournamentTabStatus>('in_progress')

  const { data: tournaments = [], isLoading, isError, refetch } = useQuery({
    queryKey: tournamentsQueryKeys.all,
    queryFn: listTournaments,
  })

  const filtered = useMemo(
    () =>
      tournaments.filter((t) => t.status === (tab as TournamentStatus)),
    [tournaments, tab],
  )

  return (
    <main className="mx-auto px-4 py-6 max-w-6xl container">
      <PageHeader
        title="Campeonatos"
        description="Round robin — rascunhos, em andamento e encerrados."
        actions={
          isAdmin ? (
            <Link
              to="/tournaments/new"
              className={cn(buttonVariants(), 'min-h-10')}
            >
              Novo campeonato
            </Link>
          ) : null
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TournamentTabStatus)}
      >
        <TabsList className="mb-4 w-full sm:w-auto">
          {TOURNAMENT_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="min-h-9">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TOURNAMENT_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Carregando…</p>
            ) : isError ? (
              <EmptyState>
                <p className="mb-3">Falha ao carregar.</p>
                <Button type="button" variant="outline" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </EmptyState>
            ) : filtered.length === 0 ? (
              <EmptyState>Nenhum campeonato nesta lista.</EmptyState>
            ) : (
              <ul className="gap-4 grid sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </ul>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </main>
  )
}
