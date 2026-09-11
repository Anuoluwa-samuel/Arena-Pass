import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion"
import { PageHeader } from "@/components/shared/page-header"
import { CmsIcon } from "@/components/site/cms-icon"
import { getPublicSiteContent } from "@/server/services/public-content"

export const dynamic = "force-dynamic"
export const metadata = { title: "About" }

export default async function AboutPage() {
  const { about, services, servicesPage } = await getPublicSiteContent()
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal trigger="mount">
        <PageHeader eyebrow="About" title={about.title} />
      </Reveal>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <Reveal trigger="mount" delay={0.08} className="space-y-6">
          <p className="whitespace-pre-line text-pretty text-lg leading-relaxed text-muted-foreground">{about.description}</p>
          {about.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={about.imageUrl} alt="" className="w-full rounded-2xl border border-border object-cover" />
          )}
        </Reveal>
        <Reveal trigger="mount" delay={0.14} className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Mission</p>
            <p className="mt-2 text-pretty">{about.mission}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Vision</p>
            <p className="mt-2 text-pretty">{about.vision}</p>
          </div>
        </Reveal>
      </div>
      {services.length > 0 && (
        <section className="mt-20">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">{servicesPage.title}</h2>
            <p className="mt-2 text-muted-foreground">{servicesPage.subtitle}</p>
          </Reveal>
          <StaggerGroup className="mt-8 grid gap-4 sm:grid-cols-2" stagger={0.08}>
            {services.map((s) => (
              <StaggerItem key={s.id}>
                <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><CmsIcon name={s.icon} className="size-5 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      )}
    </main>
  )
}
