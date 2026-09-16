# Social media exports — raw material, not final assets

Photos and videos pulled from Erick Janganya's Facebook and Instagram, added 2026-09-15.
This is **source material for review**, not finished site assets — nothing here should be
assumed cleared for public use without confirming who else is pictured and the context, the
same standard already applied to `erick-portrait.jpg` on the live site.

## What's here

- `facebook/ericjanganya/` — 110 photos (11 exact duplicate re-downloads already removed)
- `instagram/ericjanganya/` — 34 photos, 4 videos split into separate video/audio tracks
  (`*.fdash-*v.mp4` + `*.fdash-*a.m4a` pairs — an Instagram downloader artifact, not corrupt
  files). These need muxing into single playable files before they're usable anywhere:
  ```
  ffmpeg -i NAME.fdash-...v.mp4 -i NAME.fdash-...a.m4a -c copy NAME.mp4
  ```
  Not done yet — no `ffmpeg` available in the environment this was processed in.

## Already pulled into the live site

A sample was reviewed for anything usable against the site's known open image slots (see
`02-docs/` requirements doc, §13). Three photos with no other identifiable public figures in
frame, generically captioned (not tied to a specific unconfirmed date/story), were copied into
`05-src/frontend/img/` and wired in:

| Used as | Source file | Now lives at |
|---|---|---|
| Homepage "Recent moments" → Ground Visits | supplied directly by Erick, 2026-09-16 (not from this export) | `img/ground-engagement.jpg` |
| Homepage "Recent moments" → Community Meetings | `facebook/ericjanganya/486995326_…_n.jpg` | `img/community-forum.jpg` |
| About page timeline → "Running for Embakasi South" | `facebook/ericjanganya/646290794_…_n.jpg` | `img/campaign-trail.jpg` |

## Deliberately held back

- **Photos featuring other identifiable public figures** (e.g. a former Nairobi governor, and
  a few political-event shots with unconfirmed other officials) — using these implies an
  endorsement or alliance that isn't ours to assert. Flagging for Erick to pick, not guessing.
- **About page timeline stages 1–4** (childhood, school, early career, community work) — several
  photos plausibly fit, but nothing in the export is captioned, so nothing confirms what's
  actually pictured or when. Pairing an unverified photo with a specific biographical claim is
  exactly the kind of unconfirmed assertion the rest of the site is built to avoid. Needs Erick
  to identify which photo is which before any of these go in.
- `474938270_…_n.jpg` — a clean studio-style headshot (orange background), no one else in
  frame. Not wired in anywhere since `erick-portrait.jpg` is already the designated, cleared
  portrait — but it's a strong alternate if a second headshot is ever needed (press kit, admin
  profile, etc).
- Everything else — the remaining ~140 files are unreviewed. Good next step is a quick pass
  from Erick or his team tagging anything usable by event/date, since that context doesn't
  exist anywhere in the files themselves (filenames are just CDN IDs).
