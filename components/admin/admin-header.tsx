"use client"

import { useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api-client"
import { initials } from "@/lib/format"

export function AdminHeader({ user }: { user: { name: string; email: string; roleName: string } }) {
  const router = useRouter()
  const signOut = async () => {
    await api.post("/api/auth/logout").catch(() => null)
    router.push("/admin/login")
    router.refresh()
  }
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-1.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{initials(user.name)}</span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm leading-tight">{user.name}</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">{user.roleName}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled><User className="mr-2 size-4" />{user.roleName}</DropdownMenuItem>
            <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive"><LogOut className="mr-2 size-4" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
