# Design system

Arena Pass is dark-first: a floodlit-pitch palette (near-black surfaces, one vivid green) that reads as sports-tech rather than a generic dashboard. Tokens live in `app/globals.css` as OKLCH CSS variables consumed by Tailwind 4 and shadcn/ui.

## Tokens

| Token | Role |
| --- | --- |
| `--background` / `--card` / `--popover` | Three surface steps (0.12 → 0.16 lightness) |
| `--primary` (green, L 0.72) | The single accent: CTAs, live indicators, progress, prices |
| `--secondary` / `--muted` | Quiet fills for inputs, chips, skeletons |
| `--destructive`, `--warning`, `--success` | Status only, never decoration |
| `--border`, `--ring` | Hairline separators, focus ring |
| `--radius: 0.75rem` | Cards `rounded-2xl`, controls `rounded-lg`/`md`, chips `rounded-full` |

## Typography

Geist (sans) and Geist Mono (ticket numbers, references, countdowns). Scale: page titles `text-3xl/4xl font-bold tracking-tight`, section titles `text-xl/2xl`, body `text-base`, meta `text-sm text-muted-foreground`, eyebrows `text-xs uppercase tracking-[0.18em] text-primary`.

## Spacing and layout

Public pages: `max-w-7xl` containers, `px-4 sm:px-6 lg:px-8`, sections `py-20/24`. Admin: sidebar (collapsible to icons) + `px-4 sm:px-6 lg:px-8 py-6` content. Cards use `p-5/6`; grids gap `4/6`.

## Components (shared)

- `components/shared/status-badge.tsx` — one badge per domain status (session, ticket, payment, booking) with fixed tones.
- `components/shared/team-grid.tsx` — the 8 × 4 allocation board (anonymous on the public site, initials in admin).
- `components/shared/empty-state.tsx`, `page-header.tsx`.
- `components/admin/data-table.tsx` — table on desktop, stacked cards on mobile from one column definition.
- `components/admin/list-toolbar.tsx` — URL-driven filter tabs, debounced search, pagination.
- `components/admin/confirm-dialog.tsx` — destructive actions always confirm, with an optional reason for the audit log.

## States

Every list has an empty state; every async action has a spinner in its button and disables re-submission; errors surface as toasts with the API's message and field-level messages under inputs; skeleton placeholders (`--:--:--`) stand in for client-only values before hydration.

## Motion

Tokens in `lib/motion.ts` (`EASE_OUT`, `DURATION.fast/base/slow`, `STAGGER`). Reveal/stagger primitives in `components/motion.tsx`. Page transitions via `app/template.tsx`. The only looping animations are the live-dot ping, the hero glow and the "act now" CTA pulse. `prefers-reduced-motion` collapses all CSS animation and every Motion primitive falls back to static.

## Charts

Recharts, one measure per chart, one hue. Marks use `#16a34a` (≥ 5:1 on the dark surface), 2px lines with a 10% wash, bars ≤ 20px with rounded data ends, hairline grid, text in text tokens. Status breakdowns are labelled lists with icons, never colour-only slices. See `components/admin/charts.tsx`.

## Accessibility

Labels on every input, `aria-pressed` on the team picker, `role="meter"` on meters, focus rings on all interactive elements, colour never the sole carrier of status (badges carry text; the team board uses fill + dashed outline), print stylesheet for tickets.
