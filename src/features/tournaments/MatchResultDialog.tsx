import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/auth-context'
import { PlayerAvatar } from '@/features/players/PlayerAvatar'
import type { MatchCard } from '@/features/tournaments/matches-api'
import {
  leaderboardQueryKeys,
  matchesQueryKeys,
} from '@/features/tournaments/matches-api'
import { placementLabel } from '@/features/tournaments/placement-label'
import { saveMatchResult } from '@/features/tournaments/save-match-result'
import type { Uuid } from '@/types/domain'
import { DomainError } from '@/types/errors'

interface MatchResultDialogProps {
  tournamentId: Uuid
  card: MatchCard | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function initialPlacements(card: MatchCard): Record<Uuid, number | null> {
  const map: Record<Uuid, number | null> = {}
  for (const player of card.players) {
    map[player.playerId] = player.placement
  }
  return map
}

export function MatchResultDialog({
  tournamentId,
  card,
  open,
  onOpenChange,
}: MatchResultDialogProps) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [placements, setPlacements] = useState<Record<Uuid, number | null>>({})

  const matchSize = card?.players.length ?? 0
  const wasCompleted = card?.match.status === 'completed'

  useEffect(() => {
    if (card && open) {
      setPlacements(initialPlacements(card))
    }
  }, [card, open])

  const allPlaced = useMemo(() => {
    if (!card) return false
    return card.players.every((p) => placements[p.playerId] != null)
  }, [card, placements])

  const mutation = useMutation({
    mutationFn: () => {
      if (!card) throw new Error('missing card')
      const payload = card.players.map((p) => ({
        playerId: p.playerId,
        placement: placements[p.playerId]!,
      }))
      return saveMatchResult(
        { matchId: card.match.id, placements: payload },
        isAdmin,
      )
    },
    onSuccess: () => {
      toast.success(
        wasCompleted ? 'Resultado atualizado.' : 'Resultado salvo.',
      )
      void queryClient.invalidateQueries({
        queryKey: matchesQueryKeys.byTournament(tournamentId),
      })
      void queryClient.invalidateQueries({
        queryKey: matchesQueryKeys.detail(card!.match.id),
      })
      void queryClient.invalidateQueries({
        queryKey: leaderboardQueryKeys.byTournament(tournamentId),
      })
      onOpenChange(false)
    },
    onError: (err) => {
      const message =
        err instanceof DomainError ? err.message : 'Algo deu errado.'
      toast.error(message)
    },
  })

  function setPlacement(playerId: Uuid, placement: number | null) {
    setPlacements((prev) => {
      const next = { ...prev }
      if (placement != null) {
        for (const id of Object.keys(next) as Uuid[]) {
          if (id !== playerId && next[id] === placement) {
            next[id] = null
          }
        }
      }
      next[playerId] = placement
      return next
    })
  }

  if (!card) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {wasCompleted ? 'Editar resultado' : 'Lançar resultado'}
          </DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-4">
          {card.players.map((player) => {
            const value = placements[player.playerId]
            const selectValue =
              value != null ? String(value) : (null as string | null)
            return (
              <li
                key={player.playerId}
                className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PlayerAvatar
                    name={player.name}
                    avatarUrl={player.avatar_url}
                  />
                  <span className="font-medium truncate">{player.name}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="sr-only" htmlFor={`placement-${player.playerId}`}>
                    Colocação de {player.name}
                  </Label>
                  <Select
                    value={selectValue}
                    onValueChange={(next) => {
                      setPlacement(
                        player.playerId,
                        next ? Number(next) : null,
                      )
                    }}
                  >
                    <SelectTrigger
                      id={`placement-${player.playerId}`}
                      className="w-full sm:w-28"
                    >
                      <SelectValue placeholder="Colocação" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: matchSize }, (_, i) => i + 1).map(
                        (placement) => (
                          <SelectItem
                            key={placement}
                            value={String(placement)}
                          >
                            {placementLabel(placement)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </li>
            )
          })}
        </ul>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!allPlaced || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
