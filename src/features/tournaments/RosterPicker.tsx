import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreatePlayerDialog } from '@/features/players/CreatePlayerDialog'
import { PlayerAvatar } from '@/features/players/PlayerAvatar'
import { listPlayers, playersQueryKeys } from '@/features/players/players-api'
import { normalizePlayerName } from '@/domain/player-name'
import type { Uuid } from '@/types/domain'

interface RosterPickerProps {
  selectedIds: Set<Uuid>
  onSelectedIdsChange: (ids: Set<Uuid>) => void
  disabled?: boolean
}

export function RosterPicker({
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
}: RosterPickerProps) {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: players = [], isLoading } = useQuery({
    queryKey: playersQueryKeys.all,
    queryFn: listPlayers,
  })

  const normalizedSearch = normalizePlayerName(search).toLowerCase()

  const filtered = useMemo(() => {
    if (!normalizedSearch) return players
    return players.filter((p) =>
      normalizePlayerName(p.name).toLowerCase().includes(normalizedSearch),
    )
  }, [players, normalizedSearch])

  function toggle(id: Uuid) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectedIdsChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="roster-search">Participantes</Label>
          <Input
            id="roster-search"
            placeholder="Buscar por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-10 shrink-0"
          disabled={disabled}
          onClick={() => setCreateOpen(true)}
        >
          Novo jogador
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando jogadores…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {players.length === 0
            ? 'Nenhum jogador cadastrado. Crie um jogador para adicionar ao elenco.'
            : 'Nenhum jogador corresponde à busca.'}
        </p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
          {filtered.map((player) => {
            const checked = selectedIds.has(player.id)
            return (
              <li key={player.id}>
                <label
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60 has-disabled:cursor-not-allowed has-disabled:opacity-50"
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(player.id)}
                  />
                  <PlayerAvatar
                    name={player.name}
                    avatarUrl={player.avatar_url}
                    className="size-8"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {player.name}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">
        {selectedIds.size} jogador{selectedIds.size === 1 ? '' : 'es'} selecionado
        {selectedIds.size === 1 ? '' : 's'}.
      </p>

      <CreatePlayerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(player) => {
          const next = new Set(selectedIds)
          next.add(player.id)
          onSelectedIdsChange(next)
        }}
      />
    </div>
  )
}
