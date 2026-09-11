import Link from "next/link"
import { ChevronRight, Ticket, Clock, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion"
import { Magnetic } from "@/components/magnetic"
import { ScrollCue } from "@/components/scroll-cue"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="animate-float-a absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
          <div className="animate-float-b absolute bottom-0 left-0 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          {/* Above-the-fold: reveal on mount, in deliberate order (badge → heading → subtext → CTAs). */}
          <StaggerGroup
            trigger="mount"
            stagger={0.12}
            delayChildren={0.05}
            className="mx-auto max-w-2xl text-center"
          >
            <StaggerItem className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Live sessions available now
            </StaggerItem>

            <StaggerItem>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Secure Your Spot.{" "}
                <span className="text-primary">Play the Game.</span>
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
                Book football sessions with ease. Get notified when tickets become
                available and secure your spot before time runs out.
              </p>
            </StaggerItem>

            <StaggerItem className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Magnetic>
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link href="/sessions">
                    View Sessions
                    <ChevronRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </Magnetic>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/signup">Create Account</Link>
              </Button>
            </StaggerItem>
          </StaggerGroup>
        </div>

        <ScrollCue />
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-secondary/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get on the field in three simple steps
            </p>
          </Reveal>

          <StaggerGroup className="mt-16 grid gap-8 sm:grid-cols-3" stagger={0.12}>
            <StaggerItem>
              <Step
                number={1}
                icon={Ticket}
                title="Find a Session"
                description="Browse upcoming football sessions and find one that fits your schedule."
              />
            </StaggerItem>
            <StaggerItem>
              <Step
                number={2}
                icon={Clock}
                title="Wait for Window"
                description="Each session has a ticket window. When it opens, act fast to secure your spot."
              />
            </StaggerItem>
            <StaggerItem>
              <Step
                number={3}
                icon={CreditCard}
                title="Pay & Play"
                description="Complete your payment securely and receive your digital ticket instantly."
              />
            </StaggerItem>
          </StaggerGroup>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal y={24} className="overflow-hidden rounded-2xl bg-primary p-8 sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                Ready to Play?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/80">
                Join thousands of players who book their sessions through PlayPass.
              </p>
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="mt-8"
              >
                <Link href="/sessions">
                  Browse Sessions
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">P</span>
              </div>
              <span className="font-semibold">PlayPass</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} PlayPass. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Step({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: number
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="group relative flex flex-col items-center text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-300 ease-out group-hover:scale-105">
        <Icon className="size-8 text-primary" />
      </div>
      <span className="absolute -right-4 -top-2 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:-right-8">
        {number}
      </span>
      <h3 className="mt-6 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  )
}
