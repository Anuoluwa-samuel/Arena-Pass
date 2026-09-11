"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, User, LogOut } from "lucide-react"
import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { DURATION, EASE_OUT } from "@/lib/motion"

interface NavbarProps {
  isLoggedIn?: boolean
  userName?: string
}

export function Navbar({ isLoggedIn = false, userName = "Player" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const reduce = useReducedMotion()

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/sessions", label: "Sessions" },
  ]

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

  // Close the mobile menu on route change so it never persists across navigation.
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-background/95 backdrop-blur transition-shadow duration-300 supports-[backdrop-filter]:bg-background/60",
        scrolled ? "border-border shadow-sm" : "border-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">P</span>
          </div>
          <span className="text-xl font-bold">PlayPass</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
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
        <div className="hidden items-center gap-4 md:flex">
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
                  <Link href="/dashboard">My Tickets</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login" className="text-destructive">
                    <LogOut className="mr-2 size-4" />
                    Sign Out
                  </Link>
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
        <button
          className="-mr-2.5 grid place-items-center rounded-md p-2.5 md:hidden"
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
            className="overflow-hidden border-t border-border bg-background md:hidden"
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
                    href="/dashboard"
                    className="block rounded-lg px-3 py-2 text-base font-medium text-muted-foreground hover:bg-secondary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Tickets
                  </Link>
                  <Link
                    href="/login"
                    className="block rounded-lg px-3 py-2 text-base font-medium text-destructive hover:bg-secondary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Out
                  </Link>
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
