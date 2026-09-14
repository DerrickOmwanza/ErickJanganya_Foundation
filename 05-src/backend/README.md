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
