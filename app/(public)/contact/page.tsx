import { Mail, MapPin, Phone, Instagram, Twitter, MessageCircle } from "lucide-react"
import { Reveal } from "@/components/motion"
import { PageHeader } from "@/components/shared/page-header"
import { getPublicSiteContent } from "@/server/services/public-content"

export const dynamic = "force-dynamic"
export const metadata = { title: "Contact" }

export default async function ContactPage() {
  const { contact, arena } = await getPublicSiteContent()
  const rows = [
    contact.email && { icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { icon: Phone, label: "Phone", value: contact.phone, href: `tel:${contact.phone}` },
    contact.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: contact.whatsapp, href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}` },
    contact.instagram && { icon: Instagram, label: "Instagram", value: contact.instagram, href: contact.instagram.startsWith("http") ? contact.instagram : `https://instagram.com/${contact.instagram.replace("@", "")}` },
    contact.twitter && { icon: Twitter, label: "X / Twitter", value: contact.twitter, href: contact.twitter.startsWith("http") ? contact.twitter : `https://x.com/${contact.twitter.replace("@", "")}` },
    contact.address && { icon: MapPin, label: "Address", value: contact.address, href: contact.mapUrl || undefined },
  ].filter(Boolean) as Array<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string; href?: string }>

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal trigger="mount">
        <PageHeader eyebrow={arena.name} title="Get in touch" description="Questions about a session, group bookings or corporate events — we're happy to help." />
      </Reveal>
      <Reveal trigger="mount" delay={0.1} className="mt-8 grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <a key={r.label} href={r.href} target={r.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><r.icon className="size-5 text-primary" /></div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{r.label}</p>
              <p className="truncate font-medium">{r.value}</p>
            </div>
          </a>
        ))}
      </Reveal>
      {contact.mapUrl && (
        <Reveal delay={0.15} className="mt-8 overflow-hidden rounded-2xl border border-border">
          <iframe src={contact.mapUrl} title="Map" className="h-80 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </Reveal>
      )}
    </main>
  )
}
