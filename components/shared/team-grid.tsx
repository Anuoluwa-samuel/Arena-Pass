import { cn } from "@/lib/utils"

export interface TeamGridTeam {
  teamNumber: number
  name: string
  slots: Array<{ slotNumber: number; taken: boolean; label?: string | null }>
}

/**
 * The 8 × 4 allocation board. Used on the public session page (anonymous
 * dots) and in the admin session view (with player names).
 */
export function TeamGrid({ teams, highlight, onSelect, selected, compact }: { teams: TeamGridTeam[]; highlight?: number | null; onSelect?: (teamNumber: number) => void; selected?: number | null; compact?: boolean }) {
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
      {teams.map((team) => {
        const free = team.slots.filter((s) => !s.taken).length
        const isFull = free === 0
        const interactive = !!onSelect && !isFull
        const isSelected = selected === team.teamNumber
        const Wrapper = interactive ? "button" : "div"
        return (
          <Wrapper
            key={team.teamNumber}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => onSelect?.(team.teamNumber) : undefined}
            aria-pressed={interactive ? isSelected : undefined}
            className={cn(
              "rounded-xl border bg-card p-3 text-left transition-colors",
              isFull ? "border-border/60 opacity-60" : "border-border",
              interactive && "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected && "border-primary ring-1 ring-primary",
              highlight === team.teamNumber && "border-primary"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{team.name}</span>
              <span className={cn("text-xs", isFull ? "text-destructive" : "text-muted-foreground")}>{isFull ? "Full" : `${free} open`}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {team.slots.map((slot) => (
                <span
                  key={slot.slotNumber}
                  title={slot.label ?? (slot.taken ? "Taken" : "Available")}
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[11px] font-medium",
                    slot.taken ? "bg-primary/20 text-primary" : "border border-dashed border-border text-muted-foreground"
                  )}
                >
                  {slot.label ? slot.label : slot.slotNumber}
                </span>
              ))}
            </div>
          </Wrapper>
        )
      })}
    </div>
  )
}
