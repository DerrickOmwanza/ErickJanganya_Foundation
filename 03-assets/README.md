# EJ Foundation mark

**Ascending** — three rising bars, one solid colour. Retired the five-segment scorecard-arc kit
(2026-09-16): fewer, more deliberate placements this time, and the arc read as too close to the
site's tracker-progress iconography to work as a standalone identity. This mark works on a
different principle instead — one shape, no literal metaphor to explain, legible at 16px.

## Where it lives — on purpose, nowhere else

Per direct instruction: the mark appears **only** in the site's nav bar and as the favicon/home
screen icon. No footer seal, no search-overlay seal, no wordmark lockup, no colour variants. The
site's brand presence is deliberately understated — public-feeling first, personality-driven
second.

| File | Use |
| --- | --- |
| `ej-ascend.svg` | Source file — solid black, transparent background. |

That's the whole kit. In the actual site:

- **Nav bar** (`05-src/frontend/*.html`) — inlined directly as `<svg class="logo-mark">` rather
  than an `<img>`, so `fill: currentColor` lets `style.css` swap it white-on-transparent-header to
  ink-on-solid-header the same way the old wordmark text used to swap, with no second file needed.
- **Favicon** — `05-src/frontend/img/favicon.svg` (same shape, transparent background) and
  `apple-touch-icon.png` (180×180, white background, generated via Inkscape from this same file).

## Colour

Black (`#000000`) on transparent. No brand-palette version exists for this mark — it's meant to
read as a plain mark, not another place the blue/red/yellow/sky system shows up.

## Rules

- Minimum size: 16px (favicon). Below that, the gap between bars starts to close — don't go
  smaller.
- Don't recolour individual bars, don't add a background tile, don't pair it with a wordmark.
- If a new placement is ever considered (letterhead, social avatar, print), redraw from
  `ej-ascend.svg` rather than stretching a screenshot of it — it's small enough that fidelity
  matters more than convenience.
