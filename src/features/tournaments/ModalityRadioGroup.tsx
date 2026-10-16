import { Label } from '@/components/ui/label'
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
  disabled?: boolean
}

export function ModalityRadioGroup({
  value,
  onChange,
  disabled = false,
}: ModalityRadioGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Modalidade</Label>
      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((k) => (
          <label
            key={k}
            className={cn(
              'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-50',
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
    </div>
  )
}
