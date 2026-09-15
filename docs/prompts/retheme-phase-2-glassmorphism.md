# Retheme phase 2 — glassmorphism via 21st.dev

Introduce a glassmorphism surface layer using 21st.dev components. Depends on
phase 1 (`docs/prompts/retheme-phase-1-theme-and-light-palette.md`) being
merged: glass needs the real light palette and page gradient underneath it.

## Read first
- `AGENTS.md` — Next.js 16; read `node_modules/next/dist/docs/` before coding.
- `docs/DESIGN.md` — as updated by phase 1.
- `components.json` — already configured (new-york, neutral, CSS vars, RSC), so
  21st.dev registry URLs install through `npx shadcn@latest add`.

## Current state (verify, don't trust)
- Glass exists only in `components/navbar.tsx` and
  `components/admin/admin-header.tsx`. Everything else is opaque `bg-card`.

## Work
- Install components with `npx shadcn@latest add "<21st.dev registry url>"`.
  Ask me for specific component URLs rather than inventing registry paths.
- IMPORTANT: registry installs will try to overwrite `app/globals.css` and
  existing `components/ui/*`. Review every write; do not let a registry drop its
  own token block over ours, and do not let it downgrade a shadcn primitive that
  other pages depend on.
- Don't glass everything. Define ONE reusable glass surface (a `.glass` utility
  in `globals.css` or a small `components/ui/glass-card.tsx`) driven by tokens
  so it works in both themes, then apply it to:
  - the public navbar + footer,
  - the hero and session cards on `app/(public)/page.tsx` and
    `app/(public)/sessions/`,
  - `components/site/digital-ticket.tsx`,
  - the admin header and admin stat cards.
  Dense data surfaces — `components/admin/data-table.tsx`, forms, dialogs — stay
  opaque. Legibility beats effect.
- Glass over a light gradient loses contrast fast. Every glass surface needs a
  real border/ring and enough backdrop opacity that body text still hits 4.5:1
  and large text 3:1 in BOTH themes. Include a
  `@supports not (backdrop-filter: blur(0))` fallback to a solid tinted surface.
- Stacked blurs are a scroll-perf hazard; keep blur layers shallow and don't
  nest glass inside glass.

## Constraints
- Tokens only — no new hardcoded hex/rgb in components.
- Respect `prefers-reduced-motion`.
- Don't touch server/, API routes, or domain logic. Presentation only.
- Keep `npm run lint`, `npm run typecheck`, `npm test` green, and the Playwright
  specs in `tests/e2e/` passing.

## Done means
- Walk both themes on port 4000: home, session detail, checkout, digital ticket,
  admin dashboard, admin data table. Screenshot each and show me.
- `docs/DESIGN.md` gains the glass surface rule and where glass is and is not
  allowed.
