import { z } from "zod"

const link = z.object({ label: z.string().min(1).max(60), href: z.string().min(1).max(500) })

export const homepageSchema = z.object({
  hero: z.object({
    badge: z.string().max(80),
    title: z.string().min(1).max(120),
    highlight: z.string().max(120),
    description: z.string().max(500),
    primaryCta: link,
    secondaryCta: link,
    imageUrl: z.string().url().nullable(),
  }),
  howItWorks: z.object({
    title: z.string().min(1).max(120),
    subtitle: z.string().max(200),
    steps: z
      .array(z.object({ title: z.string().min(1).max(80), description: z.string().max(300), icon: z.string().max(40) }))
      .min(1)
      .max(6),
  }),
  cta: z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(300),
    buttonLabel: z.string().min(1).max(60),
    buttonHref: z.string().min(1).max(500),
  }),
  featuredSessionsCount: z.number().int().min(0).max(12),
})
export type HomepageContent = z.infer<typeof homepageSchema>

export const aboutSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(3000),
  mission: z.string().max(600),
  vision: z.string().max(600),
  imageUrl: z.string().url().nullable(),
})
export type AboutContent = z.infer<typeof aboutSchema>

export const servicesPageSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200),
})
export type ServicesPageContent = z.infer<typeof servicesPageSchema>

export const contactSchema = z.object({
  email: z.string().email().or(z.literal("")),
  phone: z.string().max(40),
  address: z.string().max(300),
  whatsapp: z.string().max(40),
  instagram: z.string().max(120),
  twitter: z.string().max(120),
  mapUrl: z.string().max(1000),
})
export type ContactContent = z.infer<typeof contactSchema>

export const CMS_PAGE_SCHEMAS = {
  homepage: homepageSchema,
  about: aboutSchema,
  services: servicesPageSchema,
  contact: contactSchema,
} as const

export type CmsContentBySlug = {
  homepage: HomepageContent
  about: AboutContent
  services: ServicesPageContent
  contact: ContactContent
}
