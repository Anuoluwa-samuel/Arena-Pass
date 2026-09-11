import { Session } from "@/components/session-card"

// Helper to create dates relative to now
const addDays = (days: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

const addHours = (date: Date, hours: number): Date => {
  const newDate = new Date(date)
  newDate.setHours(newDate.getHours() + hours)
  return newDate
}

const addMinutes = (date: Date, minutes: number): Date => {
  const newDate = new Date(date)
  newDate.setMinutes(newDate.getMinutes() + minutes)
  return newDate
}

// Generate mock sessions
export const mockSessions: Session[] = [
  {
    id: "session-1",
    date: addDays(1),
    startTime: "5:00 PM",
    endTime: "7:00 PM",
    totalSlots: 22,
    availableSlots: 6,
    price: 15,
    venue: "City Sports Complex - Field A",
    ticketWindowStart: addMinutes(new Date(), -30), // Started 30 mins ago
    ticketWindowEnd: addHours(new Date(), 4), // Ends in 4 hours
  },
  {
    id: "session-2",
    date: addDays(2),
    startTime: "6:00 PM",
    endTime: "8:00 PM",
    totalSlots: 22,
    availableSlots: 14,
    price: 15,
    venue: "Downtown Arena - Pitch 2",
    ticketWindowStart: addHours(new Date(), 2), // Opens in 2 hours
    ticketWindowEnd: addHours(new Date(), 26),
  },
  {
    id: "session-3",
    date: addDays(3),
    startTime: "4:00 PM",
    endTime: "6:00 PM",
    totalSlots: 22,
    availableSlots: 0,
    price: 12,
    venue: "City Sports Complex - Field B",
    ticketWindowStart: addDays(-1),
    ticketWindowEnd: addHours(new Date(), -2), // Closed 2 hours ago
  },
  {
    id: "session-4",
    date: addDays(4),
    startTime: "7:00 PM",
    endTime: "9:00 PM",
    totalSlots: 22,
    availableSlots: 18,
    price: 18,
    venue: "Premium Sports Hub",
    ticketWindowStart: addHours(new Date(), 24),
    ticketWindowEnd: addHours(new Date(), 48),
  },
  {
    id: "session-5",
    date: addDays(5),
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    totalSlots: 14,
    availableSlots: 3,
    price: 10,
    venue: "Community Park Field",
    ticketWindowStart: addMinutes(new Date(), -60),
    ticketWindowEnd: addHours(new Date(), 8),
  },
  {
    id: "session-6",
    date: addDays(6),
    startTime: "3:00 PM",
    endTime: "5:00 PM",
    totalSlots: 22,
    availableSlots: 22,
    price: 15,
    venue: "City Sports Complex - Field A",
    ticketWindowStart: addHours(new Date(), 48),
    ticketWindowEnd: addHours(new Date(), 72),
  },
]

export function getSessionById(id: string): Session | undefined {
  return mockSessions.find((session) => session.id === id)
}

export interface Ticket {
  id: string
  session: Session
  playerName: string
  purchaseDate: Date
  qrCode: string
}

export const mockTickets: Ticket[] = [
  {
    id: "ticket-001",
    session: mockSessions[0],
    playerName: "John Doe",
    purchaseDate: new Date(),
    qrCode: "PLAYPASS-001-ABC123",
  },
]
