import { Calendar, Clock, CreditCard, Droplets, MapPin, Shield, Star, Sun, Ticket, Trophy, Users, Zap, type LucideProps } from "lucide-react"

const ICONS = { ticket: Ticket, clock: Clock, "credit-card": CreditCard, trophy: Trophy, sun: Sun, droplets: Droplets, users: Users, shield: Shield, calendar: Calendar, "map-pin": MapPin, star: Star, zap: Zap } as const
export const CMS_ICON_NAMES = Object.keys(ICONS) as Array<keyof typeof ICONS>

export function CmsIcon({ name, ...props }: { name?: string | null } & Omit<LucideProps, "name">) {
  const Icon = (name && ICONS[name as keyof typeof ICONS]) || Star
  return <Icon {...props} />
}
