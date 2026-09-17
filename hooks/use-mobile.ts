import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Hydration-safe media query hook: the server snapshot is `false`, the
 * client subscribes to `matchMedia`, so there is no setState-in-effect and
 * no mismatch warning.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

/** True once the component has hydrated on the client. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

/**
 * Reduced-motion preference that is safe to branch markup on. It reports
 * `false` for the server render and the hydration pass, then the real value,
 * so animated and static trees never mismatch. (motion's useReducedMotion reads
 * the preference during hydration, which makes React discard the server HTML.)
 */
export function useReducedMotionSafe() {
  return useMediaQuery("(prefers-reduced-motion: reduce)")
}
