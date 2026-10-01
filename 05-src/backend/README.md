# Erick Janganya Foundation — Backend API

Node.js + Express + Prisma + Postgres. Serves the Development Tracker, Promise
Scorecard, News & Press, Events, Media, Contact, Newsletter, and admin auth
for the foundation website.

## Why Postgres, not SQLite

SQLite stores everything in one file on disk. If the app ever runs somewhere
with a non-persistent filesystem (a free-tier container, a serverless
function, anything that rebuilds on restart), that file — and every admin
account in it — gets wiped. Postgres runs as its own always-on service, so
the database survives regardless of what happens to the app server.

## One-time setup (run this on your own machine, in VS Code / Zed)

1. Create a free Postgres project on [Supabase](https://supabase.com) or
   [Neon](https://neon.tech). Copy the connection string it gives you.
2. In this `backend/` folder:
   ```
   cp .env.example .env
   ```
   Then open `.env` and fill in:
   - `DATABASE_URL` — the connection string from step 1.
   - `JWT_SECRET` — any long random string. Generate one with:
     ```
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```
   - `ADMIN_SETUP_KEY` — a private value you make up, used once to create
     your first admin account. You can remove it from `.env` afterward if
     you want to lock the registration route down further.
3. Install dependencies:
   ```
   npm install
   ```
4. Create the database tables:
   ```
   npm run prisma:migrate
   ```
   (This will prompt you to name the migration — anything like `init` is fine.)
5. (Optional but recommended) Load placeholder data so the site has
   something to render:
   ```
   npm run seed
   ```
6. Start the server:
   ```
   npm run dev
   ```
   You should see `Erick Janganya Foundation API listening on http://localhost:4000`.

## Create your admin account

With the server running, send a request (e.g. via `curl`, Postman, or
Thunder Client in VS Code):

```
POST http://localhost:4000/api/auth/register
{
  "email": "you@example.com",
  "password": "a-strong-password",
  "name": "Erick Janganya",
  "setupKey": "<the ADMIN_SETUP_KEY you put in .env>"
}
```

Then log in:

```
POST http://localhost:4000/api/auth/login
{ "email": "you@example.com", "password": "a-strong-password" }
```

This returns a `token`. Send it as `Authorization: Bearer <token>` on any
admin-only route (all the `POST`/`PUT`/`DELETE` routes below).

## Routes

All public `GET` routes support `?limit=&offset=` and return
`{ items, total, limit, offset }`.

| Resource | Public | Admin (Bearer token) |
|---|---|---|
| `/api/tracker` | `GET /`, `GET /:id` (filters: `status`, `ward`, `category`) | `POST /`, `PUT /:id`, `DELETE /:id` |
| `/api/promises` | `GET /`, `GET /:id` (filters: `status`, `category`) | `POST /`, `PUT /:id`, `DELETE /:id` |
| `/api/news` | `GET /`, `GET /:id` (filter: `sourceType`) | `POST /`, `PUT /:id`, `DELETE /:id` |
| `/api/events` | `GET /`, `GET /:id` (filter: `ward`) | `POST /`, `PUT /:id`, `DELETE /:id` |
| `/api/media` | `GET /`, `GET /:id` (filter: `type`) | `POST /`, `PUT /:id`, `DELETE /:id` |
| `/api/contact` | `POST /` (submit) | `GET /` (view submissions) |
| `/api/newsletter` | `POST /` (subscribe) | `GET /` (view subscribers) |
| `/api/auth` | `POST /register`, `POST /login` | `GET /me` |
| `/api/health` | `GET /` | — |

## Browsing data visually

```
npm run prisma:studio
```

Opens a local GUI to view/edit any table without writing SQL.

## Notes

- All seed data is placeholder, clearly marked `[Placeholder]` in the text
  fields — replace it with real, verified foundation records before launch.
- CORS is open by default (`app.use(cors())`) since the frontend is static
  HTML served separately; tighten this to a specific origin before deploying
  publicly.

## Deploying (Vercel + Neon)

The database is already on Neon. This turns the API into a Vercel
serverless function — `api/index.js` wraps the same Express app from
`src/app.js` that `npm run dev` uses locally, so routes behave identically
either way. `vercel.json` rewrites every request into that one function.

These steps happen in the Vercel dashboard, under your own account — not
something I can do for you from here:

1. **Push this repo to GitHub** (already done — `origin` is
   `DerrickOmwanza/ErickJanganya_Foundation`).
2. On [vercel.com](https://vercel.com), **New Project → import that repo**.
3. Set **Root Directory** to `05-src/backend`. Vercel auto-detects it as a
   Node project — no build command override needed (`postinstall` already
   runs `prisma generate` after every install).
4. Add **Environment Variables** (Project Settings → Environment Variables),
   copying the values from your local `.env`:
   - `DATABASE_URL` — use the Neon **pooled** connection string (the one
     with `-pooler` in the hostname), exactly like local dev. Serverless
     functions open many short-lived connections, which the pooler is built
     for.
   - `JWT_SECRET`
   - `ADMIN_SETUP_KEY`
   - Don't set `PORT` — Vercel ignores it; the serverless entry point doesn't
     call `app.listen()`.
5. Deploy. Vercel gives you a URL like
   `https://<project-name>.vercel.app`. Test it:
   `https://<project-name>.vercel.app/api/health` should return
   `{"ok":true,...}`.
6. **Connect the frontend to it** — in
   `05-src/frontend/js/api.js`, set `PROD_API_BASE` to that URL + `/api`.
   (The frontend already picks local vs. deployed automatically by hostname,
   so this is the only line to change.)

### CI

`.github/workflows/backend-ci.yml` runs on every push/PR that touches this
folder: installs, generates the Prisma client, boots the server, and checks
`/api/health` responds — independent of Vercel's own preview deploys, so a
broken dependency or a server that fails to start gets caught even before a
preview URL exists.

### Preview databases (optional, recommended once you're iterating a lot)

Vercel's **Neon integration** (Project Settings → Integrations → Neon) can
create a fresh Neon branch of your database for every pull request
automatically, and tear it down when the PR closes — so preview deploys
don't touch your real data. Set it up from the Vercel dashboard once the
project exists; it fills in a branch-specific `DATABASE_URL` for each
preview deployment on its own.

### Moving to a VPS later

Once the site is ready for public launch, the same `src/app.js` runs as a
normal long-lived Node process (`npm start`) on a VPS (e.g. HostAfrica) —
nothing about the route code changes, only how it's hosted. At that point,
also tighten CORS to the real production domain instead of the open default
above.
