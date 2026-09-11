import "server-only"
import { getDefaultArena } from "./arenas"
import { getPublishedPage, listBanners, listFaqs, listLiveAnnouncements, listServices } from "./cms"
import { getSettings } from "./settings"
import { listSessions } from "./sessions"
import { toPublicSession } from "@/server/serializers"

/** Everything the public site needs, resolved for the default arena. */
export async function getPublicSiteContent() {
  const arena = await getDefaultArena()
  const [homepage, about, servicesPage, contact, services, faqs, announcements, banners, settings] = await Promise.all([
    getPublishedPage(arena.id, "homepage"),
    getPublishedPage(arena.id, "about"),
    getPublishedPage(arena.id, "services"),
    getPublishedPage(arena.id, "contact"),
    listServices(arena.id, { publishedOnly: true }),
    listFaqs(arena.id, { publishedOnly: true }),
    listLiveAnnouncements(arena.id),
    listBanners(arena.id, { activeOnly: true }),
    getSettings(arena.id),
  ])
  return {
    arena: { id: arena.id, name: arena.name, city: arena.city, timezone: arena.timezone, currency: arena.currency },
    siteName: settings.siteName,
    homepage,
    about,
    servicesPage,
    contact,
    services: services.map((s) => ({ id: s.id, title: s.title, description: s.description, icon: s.icon })),
    faqs: faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
    announcements: announcements.map((a) => ({ id: a.id, title: a.title, content: a.content, publishAt: a.publishAt })),
    banners: banners.map(({ banner, image }) => ({ id: banner.id, title: banner.title, subtitle: banner.subtitle, linkUrl: banner.linkUrl, linkLabel: banner.linkLabel, imageUrl: image?.url ?? null })),
    maintenanceMode: settings.maintenanceMode,
  }
}

export type PublicSiteContent = Awaited<ReturnType<typeof getPublicSiteContent>>

export async function getFeaturedSessions(limit: number) {
  const arena = await getDefaultArena()
  const result = await listSessions({ arenaId: arena.id, publicOnly: true, pageSize: limit })
  return result.items.map(toPublicSession)
}
