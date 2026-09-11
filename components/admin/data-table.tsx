import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  className?: string
  /** Hide on small screens (the mobile card shows `primary` cells instead). */
  hideOnMobile?: boolean
}

/**
 * Desktop table + mobile stacked cards from the same column definition, so
 * admin lists never need horizontal scrolling on a phone.
 */
export function DataTable<T>({ columns, rows, rowKey, empty, mobileTitle }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty: React.ReactNode; mobileTitle: (row: T) => React.ReactNode }) {
  if (rows.length === 0) return <>{empty}</>
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={rowKey(row)} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 font-medium">{mobileTitle(row)}</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {columns.filter((c) => !c.hideOnMobile).map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{c.header}</dt>
                  <dd className="truncate">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>{c.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn("align-middle", c.className)}>{c.cell(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
