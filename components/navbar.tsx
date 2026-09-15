"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, User, LogOut, Ticket } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { DURATION, EASE_OUT } from "@/lib/motion"

interface NavbarProps {
  customer?: { name: string } | null
  siteName?: string
}

export function Navbar({ customer = null, siteName = "Arena Pass" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const router = useRouter()
  const isLoggedIn = !!customer
  const userName = customer?.name.split(" ")[0] ?? "Player"

  // Signed-in customers get a focused nav (book, get help, reach us); My Tickets
  // and Sign Out live in the account menu. Home and About stay reachable via the
  // logo and direct links. Shared by the desktop links and the mobile menu.
  const navLinks = isLoggedIn
    ? [
        { href: "/sessions", label: "Sessions" },
        { href: "/faq", label: "FAQ" },
        { href: "/contact", label: "Contact" },
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/sessions", label: "Sessions" },
        { href: "/about", label: "About" },
        { href: "/faq", label: "FAQ" },
        { href: "/contact", label: "Contact" },
      ]

  const signOut = async () => {
    await api.post("/api/auth/customer/logout").catch(() => null)
    setMobileMenuOpen(false)
    router.push("/")
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close the mobile menu on route change so it never persists across navigation
  // (state adjusted during render, per React's "storing previous props" pattern).
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setMobileMenuOpen(false)
  }

  return (
    <header
      className={cn(
        "glass-bar sticky top-0 z-50 border-b transition-shadow duration-300",
        scrolled ? "border-border shadow-sm" : "border-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-black tracking-tight text-primary-foreground">AP</span>
          </div>
          <span className="text-xl font-bold tracking-tight">{siteName}</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative py-1 text-sm font-medium transition-colors hover:text-primary",
                isActive(link.href)
                  ? "text-primary"
                  : "text-muted-foreground"
                )}
            >
              {link.label}
              {isActive(link.href) && (
                reduce ? (
                  <span className="absolute inset-x-0 -bottom-[1px] h-px bg-primary" />
                ) : (
                  <motion.span
                    layoutId="navbar-active-indicator"
                    className="absolute inset-x-0 -bottom-[1px] h-px bg-primary"
                    transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                  />
                )
                )}
            </Link>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle className="mr-1" />
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-secondary">
                    <User className="size-4" />
                  </div>
                  <span>{userName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/account/tickets">
                    <Ticket className="mr-2 size-4" />
                    My Tickets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            className="-mr-2.5 grid place-items-center rounded-md p-2.5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="relative block size-6">
              <AnimatePresence initial={false} mode="wait">
                {mobileMenuOpen ? (
                  <motion.span
                    key="close"
                    className="absolute inset-0 grid place-items-center"
                    initial={reduce ? false : { opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={reduce ? undefined : { opacity: 0, rotate: 90 }}
                    transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                  >
                    <X className="size-6" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    className="absolute inset-0 grid place-items-center"
                    initial={reduce ? false : { opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={reduce ? undefined : { opacity: 0, rotate: -90 }}
                    transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                  >
                    <Menu className="size-6" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence initial={false}>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
            className="overflow-hidden border-t border-border bg-popover md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-base font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-4 border-t border-border" />
              {isLoggedIn ? (
                <>
                  <Link
                    href="/account/tickets"
                    className="block rounded-lg px-3 py-2 text-base font-medium text-muted-foreground hover:bg-secondary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Tickets
                  </Link>
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-base font-medium text-destructive hover:bg-secondary"
                    onClick={signOut}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-3">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
