import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

/** KPI tile: value first, label second, optional delta/sub-line. No chart junk. */
export function StatCard({ label, value, sub, icon: Icon, tone = "default", className }: { label: string; value: string | number; sub?: string; icon?: ComponentType<{ className?: string }>; tone?: "default" | "primary" | "warning" | "destructive"; className?: string }) {
  return (
    <div className={cn("glass rounded-xl p-5 max-sm:min-w-0 max-sm:p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground max-sm:text-xs">{label}</p>
        {Icon && (
          <span className={cn("flex size-8 max-sm:hidden items-center justify-center rounded-lg", tone === "primary" ? "bg-primary/10 text-primary" : tone === "warning" ? "bg-warning/15 text-warning" : tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground")}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums max-sm:mt-1 max-sm:truncate max-sm:text-2xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground max-sm:truncate">{sub}</p>}
    </div>
  )
}
