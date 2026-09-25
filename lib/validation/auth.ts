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

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(160),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(200),
})

/** A 6-digit authenticator code, or a recovery code — both arrive in the same field. */
export const twoFactorCodeSchema = z.object({
  code: z.string().trim().min(6).max(20),
})
