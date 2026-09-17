import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SESSION_STATUS_LABELS } from "@/lib/domain/session-status"
import type { SessionStatus, TicketStatus, PaymentStatus, BookingStatus } from "@/lib/domain/constants"

type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "muted"

const TONE_CLASS: Record<Tone, string> = {
  success: "border-transparent bg-primary/15 text-[var(--success-text)]",
  warning: "border-transparent bg-warning/15 text-[var(--warning-text)]",
  danger: "border-transparent bg-destructive/15 text-[var(--danger-text)]",
  info: "border-transparent bg-sky-500/15 text-[var(--info-text)]",
  neutral: "border-transparent bg-secondary text-secondary-foreground",
  muted: "border-border bg-transparent text-muted-foreground",
}

const SESSION_TONE: Record<SessionStatus, Tone> = {
  DRAFT: "muted",
  PUBLISHED: "info",
  OPEN_FOR_BOOKING: "success",
  FULL: "danger",
  IN_PROGRESS: "warning",
  COMPLETED: "neutral",
  CANCELLED: "danger",
}

const TICKET_TONE: Record<TicketStatus, Tone> = { PENDING: "warning", CONFIRMED: "success", USED: "info", CANCELLED: "danger", REFUNDED: "neutral", EXPIRED: "muted" }
const PAYMENT_TONE: Record<PaymentStatus, Tone> = { PENDING: "warning", PAID: "success", FAILED: "danger", REFUNDED: "neutral" }
const BOOKING_TONE: Record<BookingStatus, Tone> = { PENDING: "warning", CONFIRMED: "success", CANCELLED: "danger", EXPIRED: "muted" }

function label(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ")
}

export function SessionStatusBadge({ status, className, pulse }: { status: SessionStatus; className?: string; pulse?: boolean }) {
  return (
    <Badge className={cn("gap-1.5 font-medium", TONE_CLASS[SESSION_TONE[status]], className)}>
      {status === "OPEN_FOR_BOOKING" && (
        <span className="relative flex size-1.5">
          {pulse && <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />}
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
      )}
      {SESSION_STATUS_LABELS[status]}
    </Badge>
  )
}

export function TicketStatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return <Badge className={cn("font-medium", TONE_CLASS[TICKET_TONE[status]], className)}>{label(status)}</Badge>
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return <Badge className={cn("font-medium", TONE_CLASS[PAYMENT_TONE[status]], className)}>{label(status)}</Badge>
}

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return <Badge className={cn("font-medium", TONE_CLASS[BOOKING_TONE[status]], className)}>{label(status)}</Badge>
}

export function ToneBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return <Badge className={cn("font-medium", TONE_CLASS[tone], className)}>{children}</Badge>
}
