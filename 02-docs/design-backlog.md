# Design & UX backlog

A running record of interactive/UX enhancement ideas considered for the site, so they don't get lost
in chat history. Add new ideas at the bottom of the relevant section with the date they were raised.

Status key: `Done` · `In progress` · `Queued` · `Blocked` · `Rejected`

## Queued / in progress

| Idea | Status | Notes |
|---|---|---|
| Tooltips on data chips/badges | Queued | Hover/tap explainer on funding-source chips (e.g. what "NG-CDF" means) and status badges. Directly serves the "verify every claim" mission rather than just decorating it. Raised 2026-08-16. |
| Simple chart(s) on the tracker page | Queued — blocked on data volume | Status breakdown by ward, or budget by funding source. Deliberately holding off: with ~5 mock projects a chart reads as sparse and undercuts credibility rather than building it. Revisit once real project counts grow. Raised 2026-08-16. |
| Bento-style "impact at a glance" mosaic | Queued — selective use only | One mosaic block (stats + latest news + a quote + one photo) on the Foundation page specifically. Not a site-wide layout change — would fight the full-bleed editorial sections already built and approved elsewhere. Raised 2026-08-16. |

## Considered and rejected (so we don't re-litigate them without new reasons)

| Idea | Why rejected |
|---|---|
| Earthy-neutral color palette | Contradicts the color system already settled on (blue/red/yellow/sky) after significant iteration, including the logo work done specifically to avoid clashing with it. |
| Neo-brutalism / anti-design / chaotic layouts | Undermines the trust this site exists to build. Audience is residents verifying real promises, not a design-portfolio audience. |
| WebGL / 3D elements | Real page-weight cost for a mostly mobile, mobile-data audience in Kenya, with no functional benefit here. |
| Glassmorphism / heavy skeuomorphism | Not disqualifying, just not a priority — could revisit as a tasteful accent later if it ever fits a specific component. |
| AI-personalized dynamic layouts | Solution without a matching problem for this site's scope right now. |

## Done

| Idea | Notes |
|---|---|
| Skeleton loading screens | Shipped 2026-08-16. Shimmering placeholder cards (matching real card shapes) now show on `tracker.html`, `promises.html`, and the homepage tracker preview while data is fetching, replacing the old spinner+"Loading…" text. Helpers live in `js/api.js` (`FoundationUtils.skeletonProjCards`, `skeletonSplitCards`); shimmer animation in `css/style.css` respects `prefers-reduced-motion`. |
