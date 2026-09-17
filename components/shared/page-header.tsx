import { BlurText } from "@/components/motion"
import { cn } from "@/lib/utils"

export function PageHeader({ title, description, actions, eyebrow, className }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="label-mono mb-3 text-muted-foreground"><span className="text-primary">/</span>{eyebrow}</p>}
        <BlurText as="h1" trigger="mount" text={title} stagger={0.05} className="text-balance text-4xl font-semibold uppercase leading-[0.95] sm:text-6xl" />
        {description && <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
