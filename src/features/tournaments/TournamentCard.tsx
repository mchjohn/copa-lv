import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TournamentStatusBadge } from '@/components/status-badge'
import { modalityBadgeLabel } from '@/features/tournaments/tournament-labels'
import type { Tournament } from '@/types/domain'

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  return (
    <li>
      <Link to={`/tournaments/${tournament.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Card className="overflow-hidden py-0 transition-colors hover:bg-muted/30">
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <img
              src={tournament.game_image_url}
              alt=""
              className="size-full object-cover"
            />
          </div>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <TournamentStatusBadge status={tournament.status} />
              <Badge variant="secondary">
                {modalityBadgeLabel(tournament.players_per_match)}
              </Badge>
            </div>
            <h2 className="font-semibold text-lg leading-tight">
              {tournament.title}
            </h2>
            <p className="text-muted-foreground text-sm">{tournament.game_name}</p>
          </CardContent>
        </Card>
      </Link>
    </li>
  )
}
