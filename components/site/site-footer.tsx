import Link from "next/link"
import { Mail, MapPin, Phone } from "lucide-react"

export function SiteFooter({ siteName, contact }: { siteName: string; contact: { email: string; phone: string; address: string; instagram: string; twitter: string } }) {
  return (
    <footer className="glass-bar border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-black text-primary-foreground">AP</span>
              </div>
              <span className="font-semibold">{siteName}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Organised football, booked in seconds. Eight teams, four players each, one pitch — grab your slot and play.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/sessions" className="hover:text-foreground">Upcoming sessions</Link></li>
              <li><Link href="/about" className="hover:text-foreground">About us</Link></li>
              <li><Link href="/faq" className="hover:text-foreground">FAQ</Link></li>
              <li><Link href="/account/tickets" className="hover:text-foreground">My tickets</Link></li>
              <li><Link href="/admin" className="hover:text-foreground">Arena admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {contact.email && <li className="flex items-center gap-2"><Mail className="size-4" /><a href={`mailto:${contact.email}`} className="hover:text-foreground">{contact.email}</a></li>}
              {contact.phone && <li className="flex items-center gap-2"><Phone className="size-4" /><a href={`tel:${contact.phone}`} className="hover:text-foreground">{contact.phone}</a></li>}
              {contact.address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{contact.address}</li>}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <p>Secure payments · Digital tickets · Instant confirmation</p>
        </div>
      </div>
    </footer>
  )
}
