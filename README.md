# Multimedia Upload & Search — Backend

Backend only, built to the Adsidious technical assessment spec. Node.js + Express, MongoDB (Atlas)
for metadata, Cloudinary for file storage, JWT for auth.

## Stack

- Express.js
- MongoDB / Mongoose
- Cloudinary (image/video/audio/pdf storage)
- JWT auth (bcrypt password hashing)
- Multer (in-memory upload, streamed straight to Cloudinary)
- Swagger UI (`swagger-jsdoc` + `swagger-ui-express`)
- Jest + Supertest + mongodb-memory-server for tests

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

- `MONGO_URI` — a MongoDB Atlas connection string
- `JWT_SECRET` — any long random string
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — from your Cloudinary dashboard

Run it:

```bash
npm run dev      # nodemon, http://localhost:5000
npm start        # production
npm test         # Jest, uses an in-memory Mongo instance + mocked Cloudinary calls
```

API docs are served at `http://localhost:5000/api-docs` once the server is running.

## API overview

All `/api/files/*` routes require `Authorization: Bearer <token>`.

| Method | Route                  | Description                                    |
|--------|-------------------------|-------------------------------------------------|
| POST   | `/api/auth/register`    | Create an account, returns a JWT                |
| POST   | `/api/auth/login`       | Log in, returns a JWT                           |
| GET    | `/api/auth/me`          | Current user (protected)                        |
| POST   | `/api/files/upload`     | Multipart upload (`file`, `name`, `tags`)       |
| GET    | `/api/files/search`     | `?query=&type=&from=&to=`, ranked results       |
| GET    | `/api/files/:id`        | Fetch one file, increments its view count       |

Full request/response schemas are in Swagger (`/api-docs`).

## Search & ranking

`GET /api/files/search` first filters by MongoDB (name/tag regex match, optional `type`,
optional `from`/`to` upload date range), then scores each candidate in
[`src/utils/ranking.js`](src/utils/ranking.js):

- **Keyword relevance** — exact name match > name prefix > name contains > tag match
- **Popularity** — `log2(viewCount + 1)`, so early view-count spikes don't permanently bury newer files
- **Recency** — decays as the file ages, so a fresh upload with no views still surfaces

The final `relevanceScore` is returned per result so ranking is visible/debuggable, not a black box.

## Auth notes

- Passwords are hashed with bcrypt before saving.
- JWTs expire after `JWT_EXPIRES_IN` (defaults to 7 days). No refresh-token flow — out of scope for
  a one-day backend build; noted here as an assumption per the submission guidelines.
- Tokens are just returned in the JSON response; storing them (cookie vs. localStorage) is a
  frontend concern since this is backend-only.

## Uploads

- `multer` runs in memory (no temp files on disk) and streams the buffer straight to Cloudinary.
- Allowed types: jpeg/png/gif/webp, mp4/webm/mov, mp3/wav/ogg, pdf. Anything else is rejected with 400.
- Max file size: 50MB, enforced by multer before it ever reaches Cloudinary.

## Error handling

Centralized in [`src/middleware/errorHandler.js`](src/middleware/errorHandler.js) — Multer errors,
Mongoose validation/cast errors, duplicate-key (email) errors, and JWT auth failures all resolve to
a consistent `{ success: false, message }` shape with the right status code.

## Assumptions / not implemented

- Frontend is out of scope for this deliverable (task explicitly asked for backend only).
- No refresh-token rotation — single JWT with an expiry.
- No rate limiting — would add `express-rate-limit` on `/api/auth/*` before production use.
- Deployment link: not deployed yet — this is the local codebase; wire up Railway/Render + Atlas +
  Cloudinary env vars to deploy.
