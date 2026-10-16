import { motion, useReducedMotion } from 'framer-motion'
import { podiumSlots } from '@/domain/finalize-podium'
import { PlayerAvatar } from '@/features/players/PlayerAvatar'
import { cn } from '@/lib/utils'
import type { RankedLeaderboardRow } from '@/types/domain'

interface PodiumProps {
  rows: readonly RankedLeaderboardRow[]
}

const PEDESTAL_HEIGHT: Record<1 | 2 | 3, string> = {
  1: 'h-56',
  2: 'h-44',
  3: 'h-36',
}

const PEDESTAL_BG: Record<1 | 2 | 3, string> = {
  1: 'bg-[#8b5cf6]/30',
  2: 'bg-slate-500/30',
  3: 'bg-[#22d3ee]/30',
}

const REVEAL_DELAY: Record<1 | 2 | 3, number> = {
  2: 0,
  3: 0.15,
  1: 0.3,
}

function medalLabel(position: 1 | 2 | 3): string {
  return `${position}º`
}

export function Podium({ rows }: PodiumProps) {
  const reduceMotion = useReducedMotion()
  const slots = podiumSlots(rows)

  return (
    <motion.section
      className="w-full"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
      aria-label="Pódio"
    >
      <h2 className="mb-4 font-semibold text-lg">Pódio</h2>
      <div className="flex flex-row justify-center items-end gap-3">
        {slots.map((slot) => (
          <PodiumColumn
            key={slot.position}
            slot={slot}
            reduceMotion={reduceMotion ?? false}
          />
        ))}
      </div>
    </motion.section>
  )
}

function PodiumColumn({
  slot,
  reduceMotion,
}: {
  slot: { position: 1 | 2 | 3; row: RankedLeaderboardRow | null }
  reduceMotion: boolean
}) {
  const { position, row } = slot
  const isFirst = position === 1

  return (
    <motion.div
      className="flex flex-col items-center gap-2 w-[min(28%,9rem)] sm:w-28"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.35,
        delay: reduceMotion ? 0 : REVEAL_DELAY[position],
      }}
    >
      <div className="flex flex-col justify-end items-center gap-1 w-full min-h-[7rem] text-center">
        {row ? (
          <>
            <PlayerAvatar
              name={row.player_name}
              avatarUrl={row.player_avatar}
              className={cn(isFirst ? 'size-24' : 'size-16')}
            />
            <span className="font-medium text-sm line-clamp-2 leading-tight">
              {row.player_name}
            </span>
            <span className="tabular-nums text-muted-foreground text-sm">
              {row.total_points} pts
            </span>
          </>
        ) : (
          <>
            <span
              className={cn(
                'flex justify-center items-center bg-muted rounded-full font-medium text-muted-foreground',
                isFirst ? 'size-24 text-2xl' : 'size-16 text-xl',
              )}
              aria-hidden
            >
              —
            </span>
            <span className="text-muted-foreground text-sm">—</span>
          </>
        )}
      </div>
      <div
        className={cn(
          'flex justify-center items-end pt-2 pb-3 rounded-t-lg w-full',
          PEDESTAL_HEIGHT[position],
          PEDESTAL_BG[position],
        )}
      >
        <span className="font-bold tabular-nums text-lg">
          {medalLabel(position)}
        </span>
      </div>
    </motion.div>
  )
}
