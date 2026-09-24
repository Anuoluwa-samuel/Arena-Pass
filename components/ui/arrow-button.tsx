import * as React from "react"
import { Slot, Slottable } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Signature call to action: an uppercase mono label plus a notched arrow tile.
 * On hover the arrow slides out and a fresh one slides in, and a light sheen
 * crosses the pill. Use for page-level actions; forms keep <Button>.
 */
const arrowButtonVariants = cva(
  "group/arrow sheen relative inline-flex shrink-0 items-center justify-between overflow-hidden rounded-xl label-mono outline-none transition-[transform,box-shadow,background-color] duration-300 ease-out active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        glass: "glass text-foreground hover:shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_35%,transparent),0_12px_40px_-12px_color-mix(in_oklch,var(--primary)_45%,transparent)]",
        primary: "bg-primary text-primary-foreground shadow-[0_10px_30px_-12px_color-mix(in_oklch,var(--primary)_70%,transparent)] hover:shadow-[0_16px_44px_-12px_color-mix(in_oklch,var(--primary)_85%,transparent)]",
      },
      size: {
        default: "h-12 gap-5 pl-5 pr-1.5",
        sm: "h-10 gap-4 pl-4 pr-1",
      },
    },
    defaultVariants: { variant: "glass", size: "default" },
  }
)

function ArrowButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof arrowButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"
  const tile = size === "sm" ? "size-8" : "size-9"
  return (
    <Comp data-slot="arrow-button" className={cn(arrowButtonVariants({ variant, size }), className)} {...props}>
      <Slottable>{children}</Slottable>
      <span
        aria-hidden="true"
        data-slot="arrow-tile"
        className={cn(
          "notch relative grid shrink-0 place-items-center overflow-hidden rounded-lg transition-transform duration-300 ease-out group-hover/arrow:scale-105",
          variant === "primary" ? "bg-primary-foreground text-primary" : "bg-[var(--tile-bg)] text-[var(--tile-fg)]",
          tile
        )}
      >
        <ArrowRight className="size-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/arrow:translate-x-7" />
        <ArrowRight className="absolute size-4 -translate-x-7 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/arrow:translate-x-0" />
      </span>
    </Comp>
  )
}

export { ArrowButton, arrowButtonVariants }
