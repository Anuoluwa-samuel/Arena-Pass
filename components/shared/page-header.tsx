import { cn } from "@/lib/utils"

export function PageHeader({ title, description, actions, eyebrow, className }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
