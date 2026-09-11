import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
})

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(200),
})
