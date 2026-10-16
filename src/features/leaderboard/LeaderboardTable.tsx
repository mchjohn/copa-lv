import { motion, useReducedMotion } from 'framer-motion'
import { PlayerAvatar } from '@/features/players/PlayerAvatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { RankedLeaderboardRow } from '@/types/domain'

interface LeaderboardTableProps {
  rows: readonly RankedLeaderboardRow[]
  isLoading?: boolean
  isError?: boolean
}

const motionRowClassName =
  'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'

export function LeaderboardTable({
  rows,
  isLoading,
  isError,
}: LeaderboardTableProps) {
  const reduceMotion = useReducedMotion()

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando classificação…</p>
  }

  if (isError) {
    return (
      <p className="text-muted-foreground text-sm">
        Falha ao carregar a classificação.
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">Sem jogadores.</p>
  }

  const layoutTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 500, damping: 40 }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">Posição</TableHead>
          <TableHead>Jogador</TableHead>
          <TableHead className="text-right">Partidas</TableHead>
          <TableHead className="text-right">Vitórias</TableHead>
          <TableHead className="text-right">Pontos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <motion.tr
            key={row.player_id}
            layout
            transition={layoutTransition}
            className={cn(motionRowClassName)}
          >
            <TableCell className="font-medium tabular-nums">
              {row.position}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 min-w-0">
                <PlayerAvatar
                  name={row.player_name}
                  avatarUrl={row.player_avatar}
                  className="size-8"
                />
                <span className="truncate">{row.player_name}</span>
              </div>
            </TableCell>
            <TableCell className="tabular-nums text-right">
              {row.matches_played}
            </TableCell>
            <TableCell className="tabular-nums text-right">
              {row.total_wins}
            </TableCell>
            <TableCell className="font-medium tabular-nums text-right">
              {row.total_points}
            </TableCell>
          </motion.tr>
        ))}
      </TableBody>
    </Table>
  )
}
