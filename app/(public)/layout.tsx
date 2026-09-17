import { cookies } from "next/headers"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { CustomerShell } from "@/components/site/customer-shell"
import { getCurrentCustomer } from "@/server/auth/session"
import { getPublicSiteContent } from "@/server/services/public-content"
import { SIDEBAR_COOKIE } from "@/lib/sidebar"
import { FloodlightBackdrop } from "@/components/site/floodlight-backdrop"
import { ScrollProgress } from "@/components/scroll-progress"

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [content, customer] = await Promise.all([getPublicSiteContent(), getCurrentCustomer()])

  // Signed-in customers get the glass side navigation and no footer; visitors keep the top navbar and footer.
  if (customer) {
    const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed"
    return (
      <>
        <FloodlightBackdrop />
        <ScrollProgress />
        <CustomerShell customer={{ name: customer.name, email: customer.email }} siteName={content.siteName} initialCollapsed={collapsed}>
          {children}
        </CustomerShell>
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <FloodlightBackdrop />
      <ScrollProgress />
      <SiteHeader siteName={content.siteName} />
      <div className="flex-1">{children}</div>
      <SiteFooter siteName={content.siteName} contact={content.contact} />
    </div>
  )
}
