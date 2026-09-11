"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  MoreVertical,
  Pencil,
  Trash2,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Navbar } from "@/components/navbar"
import { Spinner } from "@/components/ui/spinner"
import { StaggerGroup, StaggerItem } from "@/components/motion"
import { mockSessions } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface FormSession {
  date: string
  startTime: string
  endTime: string
  capacity: string
  price: string
  venue: string
  windowStart: string
  windowEnd: string
}

const initialFormState: FormSession = {
  date: "",
  startTime: "",
  endTime: "",
  capacity: "22",
  price: "15",
  venue: "",
  windowStart: "",
  windowEnd: "",
}

function getSessionStatus(session: {
  availableSlots: number
  ticketWindowStart: Date
  ticketWindowEnd: Date
}): "upcoming" | "open" | "closed" | "sold-out" {
  const now = new Date()

  if (session.availableSlots === 0) return "sold-out"
  if (now < session.ticketWindowStart) return "upcoming"
  if (now >= session.ticketWindowStart && now <= session.ticketWindowEnd) return "open"
  return "closed"
}

function StatusBadge({ status }: { status: "upcoming" | "open" | "closed" | "sold-out" }) {
  return (
    <Badge
      variant={
        status === "open" ? "default" :
        status === "sold-out" ? "destructive" :
        "secondary"
      }
      className={cn(status === "open" && "bg-primary")}
    >
      {status === "open" && "Open"}
      {status === "upcoming" && "Upcoming"}
      {status === "closed" && "Closed"}
      {status === "sold-out" && "Sold Out"}
    </Badge>
  )
}

function SessionActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="-m-1.5 size-11 p-1.5 sm:m-0 sm:size-8 sm:p-0">
          <MoreVertical className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Pencil className="mr-2 size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive">
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AdminDashboard() {
  const [sessions] = useState(mockSessions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState<FormSession>(initialFormState)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    setIsLoading(false)
    setIsDialogOpen(false)
    setForm(initialFormState)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const stats = {
    total: sessions.length,
    open: sessions.filter(s => getSessionStatus(s) === "open").length,
    upcoming: sessions.filter(s => getSessionStatus(s) === "upcoming").length,
    soldOut: sessions.filter(s => getSessionStatus(s) === "sold-out").length,
  }

  return (
    <div className="min-h-screen">
      <Navbar isLoggedIn userName="Admin" />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          href="/" 
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Manage football sessions and tickets
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Create Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Add a new football session for players to book.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input
                      id="venue"
                      type="text"
                      placeholder="City Sports Complex"
                      value={form.venue}
                      onChange={(e) => setForm({ ...form, venue: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={2}
                      max={50}
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="windowStart">Window Opens</Label>
                    <Input
                      id="windowStart"
                      type="datetime-local"
                      value={form.windowStart}
                      onChange={(e) => setForm({ ...form, windowStart: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="windowEnd">Window Closes</Label>
                    <Input
                      id="windowEnd"
                      type="datetime-local"
                      value={form.windowEnd}
                      onChange={(e) => setForm({ ...form, windowEnd: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Spinner className="size-4" />
                        Creating...
                      </>
                    ) : (
                      "Create Session"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <StaggerGroup
          trigger="mount"
          delayChildren={0.05}
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StaggerItem>
            <StatCard
              title="Total Sessions"
              value={stats.total}
              icon={Calendar}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Open Now"
              value={stats.open}
              icon={Clock}
              variant="success"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Coming Soon"
              value={stats.upcoming}
              icon={Users}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Sold Out"
              value={stats.soldOut}
              icon={Users}
              variant="destructive"
            />
          </StaggerItem>
        </StaggerGroup>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Sessions</CardTitle>
            <CardDescription>
              Manage and monitor your football sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile: stacked cards (avoids horizontal table scrolling) */}
            <div className="space-y-3 sm:hidden">
              {sessions.map((session) => {
                const status = getSessionStatus(session)
                return (
                  <div
                    key={session.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{formatDate(session.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.startTime} – {session.endTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusBadge status={status} />
                        <SessionActionsMenu />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">
                        {session.venue}
                      </span>
                      <span className="shrink-0 font-medium">
                        {session.availableSlots}/{session.totalSlots} spots
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-primary">
                      ${session.price}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop / tablet: table */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const status = getSessionStatus(session)
                    return (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {formatDate(session.date)}
                        </TableCell>
                        <TableCell>
                          {session.startTime} – {session.endTime}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {session.venue}
                        </TableCell>
                        <TableCell>
                          {session.availableSlots}/{session.totalSlots}
                        </TableCell>
                        <TableCell>${session.price}</TableCell>
                        <TableCell>
                          <StatusBadge status={status} />
                        </TableCell>
                        <TableCell>
                          <SessionActionsMenu />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  icon: Icon,
  variant = "default"
}: { 
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "success" | "destructive"
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg",
          variant === "default" && "bg-secondary",
          variant === "success" && "bg-primary/10",
          variant === "destructive" && "bg-destructive/10"
        )}>
          <Icon className={cn(
            "size-6",
            variant === "default" && "text-muted-foreground",
            variant === "success" && "text-primary",
            variant === "destructive" && "text-destructive"
          )} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
