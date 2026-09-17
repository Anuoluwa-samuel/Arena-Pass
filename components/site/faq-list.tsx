"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { Plus } from "lucide-react"
import { StaggerGroup, StaggerItem } from "@/components/motion"
import { cn } from "@/lib/utils"

/**
 * FAQs as separate glass cards. The plus turns into a cross as the answer
 * opens; the open card gains a brand-green edge.
 */
export function FaqList({ faqs, className }: { faqs: Array<{ id: string; question: string; answer: string }>; className?: string }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible asChild>
      <StaggerGroup className={cn("space-y-3", className)} stagger={0.06}>
        {faqs.map((f) => (
          <StaggerItem key={f.id}>
            <AccordionPrimitive.Item
              value={f.id}
              className="glass group/faq rounded-2xl transition-[box-shadow,border-color] duration-500 data-[state=open]:border-primary/40 data-[state=open]:shadow-[0_18px_50px_-24px_color-mix(in_oklch,var(--primary)_60%,transparent)]"
            >
              <AccordionPrimitive.Header className="flex">
                <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between gap-6 rounded-2xl px-6 py-5 text-left text-base font-medium outline-none transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-7">
                  {f.question}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]/faq:rotate-45 group-data-[state=open]/faq:border-primary/50 group-data-[state=open]/faq:bg-primary group-data-[state=open]/faq:text-primary-foreground">
                    <Plus className="size-4" aria-hidden="true" />
                  </span>
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="whitespace-pre-line px-6 pb-6 text-pretty leading-relaxed text-muted-foreground sm:px-7">{f.answer}</p>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </AccordionPrimitive.Root>
  )
}
