import { z } from "zod"
import { GENDERS, MIN_BIRTH_YEAR, POSITIONS, RESERVED_USERNAMES, SKILL_LEVELS, USERNAME_PATTERN } from "@/lib/domain/profile"

/** Empty strings from the form mean "not set". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()

/** Calendar date (YYYY-MM-DD) that exists, isn't in the future and isn't before 1900. `today` is injectable for tests. */
export function isValidBirthDate(value: string, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const parsed = new Date(Date.UTC(y, m - 1, d))
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) return false
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return y >= MIN_BIRTH_YEAR && parsed.getTime() <= todayUtc
}

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .refine((v) => v == null || USERNAME_PATTERN.test(v), "3–20 characters: letters, numbers, _ or . (start and end with a letter or number)")
    .refine((v) => v == null || !RESERVED_USERNAMES.has(v), "That username isn't available"),
  phone: optionalText(30),
  dateOfBirth: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .refine((v) => v == null || isValidBirthDate(v), "Enter a real date of birth (not in the future)"),
  gender: optionalEnum(GENDERS),
  city: optionalText(80),
  preferredPosition: optionalEnum(POSITIONS),
  skillLevel: optionalEnum(SKILL_LEVELS),
  emergencyContactName: optionalText(80),
  emergencyContactPhone: optionalText(30),
})
export type ProfileInput = z.infer<typeof profileSchema>

export const changePasswordSchema = z.object({
  /** Required when the account already has a password; Google-only and guest accounts are setting their first one. */
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8, "Use at least 8 characters").max(200),
})
