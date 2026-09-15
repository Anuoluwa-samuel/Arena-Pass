import { cookies } from "next/headers"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { CustomerShell } from "@/components/site/customer-shell"
import { getCurrentCustomer } from "@/server/auth/session"
import { getPublicSiteContent } from "@/server/services/public-content"
import { SIDEBAR_COOKIE } from "@/lib/sidebar"

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [content, customer] = await Promise.all([getPublicSiteContent(), getCurrentCustomer()])

  // Signed-in customers get the glass side navigation and no footer; visitors keep the top navbar and footer.
  if (customer) {
    const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed"
    return (
      <CustomerShell customer={{ name: customer.name, email: customer.email }} siteName={content.siteName} initialCollapsed={collapsed}>
        {children}
      </CustomerShell>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader siteName={content.siteName} />
      <div className="flex-1">{children}</div>
      <SiteFooter siteName={content.siteName} contact={content.contact} />
    </div>
  )
}
