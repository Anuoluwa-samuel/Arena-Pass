/**
 * Fixed, decorative stadium-floodlight layer behind the public site: two
 * drifting light beams, a breathing glow and a faint dot grid. Pure CSS
 * (transform/opacity only) so it costs no JS and stops under reduced motion.
 * Beams sweep through the lower-left and upper-right, away from the text column.
 */
export function FloodlightBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Main beam: bottom-left to top-right. A wide soft body plus a thin bright core on the same path. */}
      <div
        className="streak animate-streak left-[-25%] top-[58%] h-[22vh] w-[150vw] blur-[70px]"
        style={{ ["--streak-rotate" as string]: "-24deg" }}
      />
      <div
        className="streak animate-streak left-[-15%] top-[64%] h-[2.2vh] w-[140vw] blur-[10px]"
        style={{ ["--streak-rotate" as string]: "-24deg", animationDelay: "-6s" }}
      />
      {/* Counter beam: teal, sweeping across the top-right corner. */}
      <div
        className="streak animate-streak-alt right-[-40%] top-[-6%] h-[16vh] w-[110vw] blur-[80px]"
        style={{ ["--streak-rotate" as string]: "18deg" }}
      />
      {/* Glow pooling where the beams meet the pitch. */}
      <div className="animate-glow-breathe absolute bottom-[-20vh] left-[20%] h-[50vh] w-[60vw] rounded-full bg-[var(--streak-glow)] blur-[120px]" />
      <div className="dot-grid absolute inset-0" />
    </div>
  )
}
