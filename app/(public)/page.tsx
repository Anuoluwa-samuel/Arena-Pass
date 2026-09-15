import Link from "next/link"
import { ChevronRight, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion"
import { Magnetic } from "@/components/magnetic"
import { ScrollCue } from "@/components/scroll-cue"
import { SessionCard } from "@/components/session-card"
import { CmsIcon } from "@/components/site/cms-icon"
import { getFeaturedSessions, getPublicSiteContent } from "@/server/services/public-content"

export const dynamic = "force-dynamic"

export default async function LandingPage() {
  const content = await getPublicSiteContent()
  const { homepage, services, faqs, announcements, banners } = content
  const featured = homepage.featuredSessionsCount > 0 ? await getFeaturedSessions(homepage.featuredSessionsCount) : []
  const openCount = featured.filter((s) => s.status === "OPEN_FOR_BOOKING").length
  const slotsLeft = featured.filter((s) => s.status === "OPEN_FOR_BOOKING").reduce((n, s) => n + s.availableSlots, 0)
  const announcement = announcements[0]

  return (
    <div>
      {announcement && (
        <div className="border-b border-primary/20 bg-primary/10">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
            <Megaphone className="size-4 shrink-0 text-primary" />
            <p className="min-w-0 truncate">
              <span className="font-semibold text-primary">{announcement.title}</span>
              <span className="text-muted-foreground"> — {announcement.content}</span>
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="animate-float-a absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
          <div className="animate-float-b absolute bottom-0 left-0 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl" />
          <div className="pitch-lines absolute inset-0 [opacity:var(--pitch-opacity)]" aria-hidden="true" />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <StaggerGroup trigger="mount" stagger={0.12} delayChildren={0.05} className="mx-auto max-w-2xl text-center">
            {homepage.hero.badge && (
              <StaggerItem className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-primary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {openCount > 0 ? `${openCount} session${openCount === 1 ? "" : "s"} open · ${slotsLeft} slots left` : homepage.hero.badge}
              </StaggerItem>
            )}
            <StaggerItem>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                {homepage.hero.title} <span className="text-primary">{homepage.hero.highlight}</span>
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">{homepage.hero.description}</p>
            </StaggerItem>
            <StaggerItem className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Magnetic>
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link href={homepage.hero.primaryCta.href}>
                    {homepage.hero.primaryCta.label}
                    <ChevronRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </Magnetic>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link href={homepage.hero.secondaryCta.href}>{homepage.hero.secondaryCta.label}</Link>
              </Button>
            </StaggerItem>
          </StaggerGroup>
        </div>
        <ScrollCue />
      </section>

      {/* Featured sessions */}
      {featured.length > 0 && (
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">This week</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight">Upcoming sessions</h2>
              </div>
              <Button variant="ghost" asChild>
                <Link href="/sessions">
                  All sessions <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </Reveal>
            <StaggerGroup className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.1}>
              {featured.map((s) => (
                <StaggerItem key={s.id}>
                  <SessionCard session={s} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-t border-border bg-secondary/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{homepage.howItWorks.title}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{homepage.howItWorks.subtitle}</p>
          </Reveal>
          <StaggerGroup className="mt-16 grid gap-8 sm:grid-cols-3" stagger={0.12}>
            {homepage.howItWorks.steps.map((step, i) => (
              <StaggerItem key={i}>
                <div className="group relative flex flex-col items-center text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-300 ease-out group-hover:scale-105">
                    <CmsIcon name={step.icon} className="size-8 text-primary" />
                  </div>
                  <span className="absolute -right-4 -top-2 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:-right-8">{i + 1}</span>
                  <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground">{step.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.servicesPage.title}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{content.servicesPage.subtitle}</p>
            </Reveal>
            <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
              {services.map((s) => (
                <StaggerItem key={s.id}>
                  <div className="h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                    <CmsIcon name={s.icon} className="size-6 text-primary" />
                    <h3 className="mt-4 font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      )}

      {/* Banner */}
      {banners[0] && (
        <section className="pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="relative overflow-hidden rounded-2xl border border-border bg-card">
              {banners[0].imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={banners[0].imageUrl} alt="" className="absolute inset-0 size-full object-cover opacity-30" />
              )}
              <div className="relative flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
                <div>
                  <h3 className="text-2xl font-bold">{banners[0].title}</h3>
                  {banners[0].subtitle && <p className="mt-2 text-muted-foreground">{banners[0].subtitle}</p>}
                </div>
                {banners[0].linkUrl && (
                  <Button asChild size="lg">
                    <Link href={banners[0].linkUrl}>{banners[0].linkLabel || "Learn more"}</Link>
                  </Button>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="border-t border-border bg-secondary/30 py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:px-8">
            <Reveal>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions, answered</h2>
              <p className="mt-4 text-muted-foreground">Everything you need to know before your first session.</p>
              <Button variant="outline" asChild className="mt-6">
                <Link href="/faq">See all FAQs</Link>
              </Button>
            </Reveal>
            <Reveal delay={0.1}>
              <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
                {faqs.slice(0, 4).map((f) => (
                  <AccordionItem key={f.id} value={f.id}>
                    <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal y={24} className="overflow-hidden rounded-2xl bg-primary p-8 sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">{homepage.cta.title}</h2>
              <p className="mt-4 text-lg text-primary-foreground/80">{homepage.cta.description}</p>
              <Button size="lg" variant="secondary" asChild className="mt-8">
                <Link href={homepage.cta.buttonHref}>
                  {homepage.cta.buttonLabel}
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
