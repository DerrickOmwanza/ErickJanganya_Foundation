# EJ Foundation logo assets

**Scorecard arc** — a gauge in five segments, one per ward of Embakasi South, ending on a
single accent color. Colors are pulled directly from `05-src/frontend/css/style.css` `:root`
— nothing here is a new hex value.

## Files

| File | Use |
| --- | --- |
| `ej-mark.svg` | Symbol only, full color. Default. |
| `ej-mark-on-blue.svg` | Symbol only, for placement on the site's own `--blue` (`#0064F0`) — segment 1 swaps to `--blue-deep` (`#0047AD`) so it doesn't disappear into a same-color background. Used in the footer. |
| `ej-mark-reversed.svg` | Symbol only, for dark backgrounds (structural segment swaps to white). |
| `ej-mark-mono.svg` | Symbol only, one color via `currentColor` — for favicons, inline text, or any context too small for five colors to read. |
| `ej-lockup-horizontal.svg` | Symbol + wordmark, for headers. |
| `ej-lockup-horizontal-reversed.svg` | Same, on dark. |
| `ej-lockup-stacked.svg` | Symbol above wordmark, for narrow space. |
| `favicon.svg` | Square accent-color tile with a mono mark, for tabs and app icons. |

## Colors

Pulled from the site's existing palette — none introduced for this mark.

| Role | Segment | Hex |
| --- | --- | --- |
| Structural | 1 | Blue `#0064F0` |
| Structural | 2 | Sky `#8EDDFF` |
| Structural | 3 | Yellow `#FFBD12` |
| Structural | 4 | Ink `#15191B` (→ white `#FFFFFF` on dark) |
| **Accent** | 5 | Red `#CE2227` |

Four structural segments carry the "five wards, one instrument" idea; red is the site's
existing accent color (already used for the launch strip, trust line, and eyebrow text) and
carries the emphasis here too — same role as any other accent use on the site.

## Type

Wordmark is set in **Oswald 700**, already loaded site-wide as `--font-display`
(`05-src/frontend/css/style.css:16`) — no new typeface added. Tagline is Oswald 500.

## Integration

Inline in a header (recommended — lets CSS recolor `ej-mark-mono.svg` via `color`):

```html
<img src="img/ej-mark.svg" alt="" width="48" height="28">
```

Favicon:

```html
<link rel="icon" type="image/svg+xml" href="img/favicon.svg">
```

## Rules

- Minimum size: mark 20px tall, horizontal lockup 140px wide. Below that, use `ej-mark-mono.svg`
  or `favicon.svg` instead of the full-color mark — the segment gaps stop reading at small sizes.
- Clear space: one segment's width on all sides (roughly 1/6 of the mark's height).
- Don't rotate, outline, add shadows, or recolor the four structural segments individually —
  the accent segment is the only one that may shift (e.g. to a status color elsewhere on the
  site) without redrawing the whole mark.
- Use the `-reversed` variant on dark surfaces rather than placing the default mark on a dark
  background — the ink segment (`#15191B`) disappears otherwise.
- Use `-on-blue` rather than the default mark on any surface using the site's own `--blue`
  (footer, CTA band) — segment 1 is the same blue as those backgrounds and vanishes otherwise.

## Retired

The previous mark (dark green-and-gold civic medallion, `EJ_Seal_FINAL*`) and its working
files have been removed — they were never wired into any page. A third mark (a crowned
blackletter "EJ" monogram) is still live in `05-src/frontend/img/` — referenced in the
header, footer, search overlay, and favicon links across every page. That one hasn't been
touched yet; swapping it for this kit is a separate follow-up since it means editing every
HTML page.
