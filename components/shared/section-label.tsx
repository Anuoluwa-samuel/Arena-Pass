import { cn } from "@/lib/utils"

/** The "02 /SESSIONS" section marker: a brand-green index and a muted mono label. */
export function SectionLabel({ index, children, className }: { index?: number | string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("label-mono text-muted-foreground", className)}>
      {index !== undefined && <span className="mr-2 text-primary">{typeof index === "number" ? String(index).padStart(2, "0") : index}</span>}
      /{children}
    </p>
  )
}
