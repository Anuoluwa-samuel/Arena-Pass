import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { getPublicSiteContent } from "@/server/services/public-content"

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const content = await getPublicSiteContent()
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader siteName={content.siteName} />
      <div className="flex-1">{children}</div>
      <SiteFooter siteName={content.siteName} contact={content.contact} />
    </div>
  )
}
