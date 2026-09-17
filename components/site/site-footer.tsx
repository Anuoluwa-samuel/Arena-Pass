import Link from "next/link"
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react"
import { Parallax } from "@/components/motion"
import { SectionLabel } from "@/components/shared/section-label"

const EXPLORE = [
  { href: "/sessions", label: "Upcoming sessions" },
  { href: "/about", label: "About us" },
  { href: "/faq", label: "FAQ" },
  { href: "/account/tickets", label: "My tickets" },
  { href: "/admin", label: "Arena admin" },
]

export function SiteFooter({ siteName, contact }: { siteName: string; contact: { email: string; phone: string; address: string; instagram: string; twitter: string } }) {
  return (
    <footer className="relative mt-12 overflow-hidden border-t border-border">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary shadow-[0_0_24px_-6px_var(--primary)]">
                <span className="text-xs font-black text-primary-foreground">AP</span>
              </div>
              <span className="text-lg font-semibold tracking-tight">{siteName}</span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Organised football, booked in seconds. Eight teams, four players each, one pitch — grab your slot and play.
            </p>
          </div>
          <div>
            <SectionLabel>Explore</SectionLabel>
            <ul className="mt-5 space-y-3 text-sm">
              {EXPLORE.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="group inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                    <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel>Contact</SectionLabel>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {contact.email && <li className="flex items-center gap-2.5"><Mail className="size-4 text-primary" /><a href={`mailto:${contact.email}`} className="transition-colors hover:text-foreground">{contact.email}</a></li>}
              {contact.phone && <li className="flex items-center gap-2.5"><Phone className="size-4 text-primary" /><a href={`tel:${contact.phone}`} className="transition-colors hover:text-foreground">{contact.phone}</a></li>}
              {contact.address && <li className="flex items-start gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" />{contact.address}</li>}
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-muted-foreground sm:flex-row">
          <p className="label-mono">© {new Date().getFullYear()} {siteName}</p>
          <p className="label-mono">Secure payments · Digital tickets · Instant confirmation</p>
        </div>
      </div>
      {/* Giant wordmark, rising slightly as the page reaches its end. */}
      <Parallax distance={40} className="pointer-events-none select-none" >
        <p aria-hidden="true" className="text-wordmark -mb-[0.12em] mt-6 whitespace-nowrap text-center font-display text-[clamp(5rem,22vw,20rem)] font-bold uppercase leading-none">
          {siteName.toUpperCase()}
        </p>
      </Parallax>
    </footer>
  )
}
