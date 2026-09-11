import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Reveal } from "@/components/motion"
import { PageHeader } from "@/components/shared/page-header"
import { getPublicSiteContent } from "@/server/services/public-content"

export const dynamic = "force-dynamic"
export const metadata = { title: "FAQ" }

export default async function FaqPage() {
  const { faqs, contact } = await getPublicSiteContent()
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal trigger="mount">
        <PageHeader eyebrow="Help" title="Frequently asked questions" description="Can't find what you need? Email us and we'll get back to you the same day." />
      </Reveal>
      <Reveal trigger="mount" delay={0.1} className="mt-8">
        {faqs.length === 0 ? (
          <p className="text-muted-foreground">No FAQs published yet.</p>
        ) : (
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Reveal>
      {contact.email && (
        <p className="mt-8 text-sm text-muted-foreground">Still stuck? <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a></p>
      )}
    </main>
  )
}
