# Erick Janganya Foundation — Digital Platform

Base project folder. Everything related to this build lives here going forward.

## Status: Wireframe stage — approved by client review pending

## Folder structure

- **01-wireframe/** — The interactive HTML wireframe prototype (`Erick_Janganya_Foundation_Wireframe.html`). Open it directly in any browser. Simulates the full public site and admin/CMS with working navigation, filters, and demo interactions. No real content yet — placeholders only.
- **02-docs/** — Planning and reference documents. Currently holds the section-by-section presentation manual (`Erick_Janganya_Foundation_Wireframe_Manual.docx`) used for client pitches. Future planning docs (content requirements, technical spec, sign-off notes) go here too.
- **03-assets/** — Empty for now. Final brand assets go here once available: logo files, official photography, colour/type specimens, favicon, social preview images.
- **04-content/** — Empty for now. Real content the client supplies goes here before it's loaded into the CMS: biography text, project data, promise list, testimonials, contact details, media files.
- **05-src/** — Empty for now. Actual application code goes here once development starts.
  - `frontend/` — the public site + admin CMS UI
  - `backend/` — API, database, auth, media storage, CMS logic

## Next steps

1. Client reviews and signs off on the wireframe (`01-wireframe/`).
2. Content collection begins (`04-content/`).
3. Final brand/visual assets locked (`03-assets/`).
4. Development starts in `05-src/`.

See `02-docs/Erick_Janganya_Foundation_Wireframe_Manual.docx` for the full section-by-section breakdown of what every page and admin screen does.

## Deployment

The site is built and tested on [Vercel](https://vercel.com) (hosting + CI/CD) with [Neon](https://neon.tech) as the Postgres database, as two separate Vercel projects from this one repo:

- **Frontend** — Root Directory `05-src/frontend`. Plain static HTML/CSS/JS, no build step; Vercel serves it as-is.
- **Backend** — Root Directory `05-src/backend`. Express API running as Vercel serverless functions. Full setup steps, environment variables, and the CI workflow are documented in [`05-src/backend/README.md`](05-src/backend/README.md#deploying-vercel--neon).

Every push to `main` deploys to production; every pull request gets its own preview URL for both projects automatically, once each is connected to this GitHub repo in the Vercel dashboard.

Once the site is verified and ready for public launch, the backend moves from Vercel to a VPS (e.g. HostAfrica) as a normal long-running Node process — the application code doesn't change, only where it's hosted.
