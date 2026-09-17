"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function FilterTabs({ param = "status", options, className }: { param?: string; options: Array<{ value: string; label: string; count?: number }>; className?: string }) {
  const pathname = usePathname()
  const search = useSearchParams()
  const current = search.get(param) ?? options[0]?.value
  return (
    <div className={cn("flex flex-wrap gap-1 rounded-lg bg-secondary/60 p-1 max-sm:no-scrollbar max-sm:flex-nowrap max-sm:overflow-x-auto", className)}>
      {options.map((o) => {
        const params = new URLSearchParams(search.toString())
        if (o.value === options[0].value) params.delete(param)
        else params.set(param, o.value)
        params.delete("page")
        const href = params.size ? `${pathname}?${params}` : pathname
        return (
          <Link key={o.value} href={href} className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors max-sm:shrink-0 max-sm:whitespace-nowrap",current === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 text-xs text-muted-foreground">{o.count}</span>}
          </Link>
        )
      })}
    </div>
  )
}

/** Debounced search box that writes ?q= to the URL so server components re-query. */
export function SearchBox({ placeholder = "Search…", className }: { placeholder?: string; className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const search = useSearchParams()
  const [value, setValue] = useState(search.get("q") ?? "")
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(search.toString())
      if (value) params.set("q", value)
      else params.delete("q")
      params.delete("page")
      const next = params.size ? `${pathname}?${params}` : pathname
      if (next !== (search.size ? `${pathname}?${search}` : pathname)) router.replace(next)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="pl-9" aria-label="Search" />
    </div>
  )
}

export function Pagination({ page, totalPages, total, pageSize }: { page: number; totalPages: number; total: number; pageSize: number }) {
  const pathname = usePathname()
  const search = useSearchParams()
  const link = (p: number) => {
    const params = new URLSearchParams(search.toString())
    if (p <= 1) params.delete("page")
    else params.set("page", String(p))
    return params.size ? `${pathname}?${params}` : pathname
  }
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row">
      <p>Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild={page > 1} disabled={page <= 1}>{page > 1 ? <Link href={link(page - 1)}>Previous</Link> : <span>Previous</span>}</Button>
        <span className="px-2 tabular-nums">{page} / {totalPages}</span>
        <Button variant="outline" size="sm" asChild={page < totalPages} disabled={page >= totalPages}>{page < totalPages ? <Link href={link(page + 1)}>Next</Link> : <span>Next</span>}</Button>
      </div>
    </div>
  )
}
