# Design system

Arena Pass ships two themes from one token set. **Light** is a whitish gradient with a deep pitch green; **dark** is the floodlit pitch — near-black surfaces, one vivid green. Both read as sports-tech rather than a generic dashboard. Tokens live in `app/globals.css` as OKLCH CSS variables consumed by Tailwind 4 and shadcn/ui: `:root` holds the light values, `.dark` overrides them.

## Theming

`next-themes` (mounted in `app/layout.tsx`, `attribute="class"`, default `system`) puts `.dark` on `<html>` before first paint; `<html>` carries `suppressHydrationWarning` for that reason. Users switch via `components/theme-toggle.tsx` (light / dark / system) in the public navbar and the admin header. Its trigger icon is swapped with the `dark:` variant, not React state, so server and client markup match.

Rules: components use tokens only — never a raw colour, never a `dark:` override for a colour that a token could carry. A new colour means a new variable in **both** `:root` and `.dark`.

## Tokens

| Token | Role |
| --- | --- |
| `--background` / `--card` / `--popover` | Surface steps. Light: 0.985 → white cards. Dark: 0.12 → 0.16 |
| `--primary` (green) | The single accent: CTAs, live indicators, progress, prices. Light L 0.54 (carries white text, ≥ 4.5:1 as text on white); dark L 0.72 (carries dark text) |
| `--gradient-page` | Ambient page background, painted once on `body` and fixed to the viewport. Light: near-white with a faint green top glow; dark: a barely-there lift on near-black. Never repeat it on cards |
| `--pitch-line` / `--pitch-opacity` | Hero pitch-marking colour and layer strength (light needs more to register on white) |
| `--chart-mark` / `--chart-grid` / `--chart-axis` / `--chart-cursor` | Recharts colours, passed as `var()` strings |
| `--secondary` / `--muted` | Quiet fills for inputs, chips, skeletons |
| `--destructive`, `--warning`, `--success` | Status only, never decoration |
| `--border`, `--ring` | Hairline separators, focus ring |
| `--radius: 0.75rem` | Cards `rounded-2xl`, controls `rounded-lg`/`md`, chips `rounded-full` |

## Glass

One translucent surface, defined once in `app/globals.css` and themed by the `--glass-*` tokens:

- **`glass`** — cards and pills: translucent `--glass-bg`, 1px `--glass-border`, a top-edge `--glass-highlight`, soft `--glass-shadow`, `backdrop-filter: blur(var(--glass-blur)) saturate(140%)`. Its shadow goes through Tailwind's `--tw-*` shadow variables, so `ring-*` on the same element composes instead of being replaced. On shadcn `Card`, use `variant="glass"` (it swaps out `bg-card border shadow-sm`) — don't stack the class on a default card.
- **`glass-bar`** — edge-to-edge bars (sticky headers, footer): frost only; the element keeps its own hairline border.
- Browsers without `backdrop-filter` get a solid `--glass-fallback`; print strips blur from tickets.

**Where it's used:** public navbar and footer, the hero status pill, `SessionCard`, `DigitalTicket`, the admin header and `StatCard`. The admin `SidebarInset` is transparent so the page gradient reaches admin content.

**Where it's not:** tables (`data-table.tsx`), forms, dialogs, sheets, popovers, and chart panels stay opaque — legibility beats effect. Never nest glass in glass (the mobile menu inside the glass navbar stays solid). Keep blur layers shallow; stacked blurs cost scroll performance.

**Contrast:** glass sits at 62% (light) / 55% (dark) of `--card` over the low-chroma page gradient, so body text stays ≥ 4.5:1 in both themes. Don't lower the opacity or put glass over imagery without re-checking.

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

Recharts, one measure per chart, one hue. Marks use `--chart-mark` (≥ 5:1 on each theme's surface; `#16a34a` in dark), 2px lines with a 10% wash, bars ≤ 20px with rounded data ends, hairline grid (`--chart-grid`), text in `--chart-axis`. Colours are `var()` strings, so charts re-colour on theme change without re-rendering. Status breakdowns are labelled lists with icons, never colour-only slices. See `components/admin/charts.tsx`.

## Accessibility

Labels on every input, `aria-pressed` on the team picker, `role="meter"` on meters, focus rings on all interactive elements, colour never the sole carrier of status (badges carry text; the team board uses fill + dashed outline), print stylesheet for tickets (forces white and drops the page gradient). Text contrast is checked in both themes.
