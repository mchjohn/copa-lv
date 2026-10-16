import { Label } from '@/components/ui/label'
import { qualifyingMatchCountForRoster } from '@/domain/round-robin'
import {
  modalityBadgeLabel,
  modalityScoringSummary,
} from '@/features/tournaments/tournament-labels'
import type { PlayersPerMatch } from '@/types/domain'
import { cn } from '@/lib/utils'

const OPTIONS: PlayersPerMatch[] = [2, 3, 4]

interface ModalityRadioGroupProps {
  value: PlayersPerMatch
  onChange: (value: PlayersPerMatch) => void
  rosterCount?: number
  disabled?: boolean
}

export function ModalityRadioGroup({
  value,
  onChange,
  rosterCount = 0,
  disabled = false,
}: ModalityRadioGroupProps) {
  const matchCount = qualifyingMatchCountForRoster(rosterCount, value)

  return (
    <div className="flex flex-col gap-2">
      <Label>Modalidade</Label>
      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((k) => (
          <label
            key={k}
            className={cn(
              'flex items-center gap-2 has-disabled:opacity-50 px-3 py-2 border border-border rounded-lg min-h-10 text-sm cursor-pointer has-disabled:cursor-not-allowed',
              value === k && 'border-primary/60 bg-primary/10',
            )}
          >
            <input
              type="radio"
              name="players_per_match"
              className="accent-primary"
              checked={value === k}
              disabled={disabled}
              onChange={() => onChange(k)}
            />
            {modalityBadgeLabel(k)}
          </label>
        ))}
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {modalityScoringSummary(value)}
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Cada jogador joga 3 partidas na TV.
        {matchCount != null
          ? ` ${rosterCount} jogadores → ${matchCount} partidas classificatórias.`
          : ' Ajuste o número de jogadores para esta modalidade.'}
      </p>
    </div>
  )
}
