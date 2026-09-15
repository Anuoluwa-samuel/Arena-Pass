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
| `--gradient-page` | Ambient aurora painted once on `body` and fixed to the viewport: emerald, teal, lime and mint blobs over a mint wash (light) or near-black (dark). It is what the glass shows, so it doubles as the contrast budget. Never repeat it on cards |
| `--pitch-line` / `--pitch-opacity` | Hero pitch-marking colour and layer strength (light needs more to register on white) |
| `--chart-mark` / `--chart-grid` / `--chart-axis` / `--chart-cursor` | Recharts colours, passed as `var()` strings |
| `--secondary` / `--muted` | Quiet fills for inputs, chips, skeletons |
| `--destructive`, `--warning`, `--success` | Status only, never decoration |
| `--border`, `--ring` | Hairline separators, focus ring |
| `--radius: 0.75rem` | Cards `rounded-2xl`, controls `rounded-lg`/`md`, chips `rounded-full` |

## Glass

The whole interface is glass over the aurora page gradient. Two settings drive it: `--glass-tint` (10%) and `--glass-blur` (10px).

- **Surface tokens are translucent.** `--card` and `--sidebar` are a 10% tint of their `*-solid` colour; `--popover` is an 80% tint. A global rule in `app/globals.css` gives every element painting `bg-card`, `bg-sidebar` or `bg-popover` a `blur(var(--glass-blur)) saturate(140%)` backdrop, so cards, chart panels, data-table cards, both sidebars, menus and dialogs are glass without per-component work. New components inherit it by using the tokens.
- **`glass`** (cards, pills, the customer sidebar): the same 10% tint plus a 1px `--glass-border`, top-edge `--glass-highlight` and soft `--glass-shadow`. Its shadow composes with `ring-*` via Tailwind's `--tw-*` variables. On `Card` and `SheetContent`, use `variant="glass"` rather than stacking the class.
- **`glass-bar`** (sticky headers, footer): 30% tint. Bars sit over scrolling text, so they carry more than panels.
- **Floating layers** (dropdowns, selects, popovers, tooltips, dialogs, alert dialogs, the mobile menu): `bg-popover`, 80% frost. They cover other content, so 10% would be unreadable.
- **Fallback:** without `backdrop-filter` support, every surface falls back to its `*-solid` colour. Print forces a white ticket with no blur.

**Blur must sit on the element itself.** An element that is transformed, animated or already blurring is a backdrop root; a glass child inside it blurs nothing and the page shows through sharp. Put the variant on the animated container (see `SheetContent variant="glass"`).

**Contrast:** at 10% the text effectively sits on the gradient, so the gradient is the contrast budget. Light blobs stay at L ≥ 0.93 and dark blobs at L ≤ 0.26 (dark visibility comes from chroma and coverage, not lightness); light `--muted-foreground` is L 0.44. Re-check both themes before brightening the gradient or lowering the tint further, and never put clear glass directly over photos (the hero image has its own scrim).

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

Tokens in `lib/motion.ts` (`EASE_OUT`, `DURATION.fast/base/slow`, `STAGGER`). Reveal/stagger primitives in `components/motion.tsx`. Page transitions via `app/template.tsx`. The only looping animations are the live-dot ping, the hero glow, the "act now" CTA pulse, and the WebGL smoke (`SmokeyBackground`) behind the customer auth pages. Signed-in customers get a side navigation instead of the top navbar, and no site footer: the sidebar slides in on first load, springs between 256px and 76px via the chevron beside the logo, which flips direction (state kept in the `ap_sidebar` cookie so the server renders the right width; Ctrl/⌘+B also toggles), labels fade with the width, the active item's pill slides between links via a shared `layoutId`, and the mobile drawer cascades its rows in. All of it drops to instant under reduced motion. The smoke takes its colours from `--primary` / `--background`, is decorative (`aria-hidden`, no pointer events), and renders a single still frame under reduced motion. `prefers-reduced-motion` collapses all CSS animation and every Motion primitive falls back to static.

## Charts

Recharts, one measure per chart, one hue. Marks use `--chart-mark` (≥ 5:1 on each theme's surface; `#16a34a` in dark), 2px lines with a 10% wash, bars ≤ 20px with rounded data ends, hairline grid (`--chart-grid`), text in `--chart-axis`. Colours are `var()` strings, so charts re-colour on theme change without re-rendering. Status breakdowns are labelled lists with icons, never colour-only slices. See `components/admin/charts.tsx`.

## Accessibility

Labels on every input, `aria-pressed` on the team picker, `role="meter"` on meters, focus rings on all interactive elements, colour never the sole carrier of status (badges carry text; the team board uses fill + dashed outline), print stylesheet for tickets (forces white and drops the page gradient). Text contrast is checked in both themes.
