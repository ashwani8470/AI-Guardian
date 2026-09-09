# AI Guardian — Web Frontend

React (Vite) + Tailwind frontend for the AI Guardian FastAPI backend.

## Setup

```bash
npm install
cp .env.example .env   # edit VITE_API_BASE_URL if your backend runs elsewhere
npm run dev
```

## What's here

- `/login`, `/signup` — auth pages, hit `/auth/login` and `/auth/signup`
- `/app` — dashboard overview with tiles for each scan type
- `/app/scan/text`, `/scan/url`, `/scan/email`, `/scan/qr`, `/scan/screenshot` — one page per modality, each posts to the matching `/predict/*` endpoint
- `/app/history` — table view of `GET /history`

## Things to double check against your actual backend

1. **Login contract** (`src/context/AuthContext.jsx`): currently sends
   `{ email, password }` as JSON to `/auth/login` and expects
   `{ access_token }` back. If your backend uses FastAPI's OAuth2 form-based
   login (`username`/`password` as form fields instead of JSON), swap the
   `api.login` call in `src/api/client.js` to send `FormData` instead.
2. **Image payload shape** (`/predict/qr`, `/predict/screenshot`): currently
   sends `{ image_base64: "..." }`. Match this key to whatever your CV
   teammates' handoff contract actually expects.
3. **History response shape**: currently expects either `{ scans: [...] }` or
   a raw array, with fields `scan_type`, `risk_tier`, `risk_score`,
   `timestamp`. Adjust field names in `src/pages/History.jsx` if your
   `ScanResponse` schema uses different keys.
4. **CORS**: your backend note says `allow_origins=["*"]` — fine for local
   dev, but restrict it before any real deployment.

## Design

Dark slate-navy theme (`#0F1720` base) with a guardian-green brand accent
(`#3DDC97`) reserved mostly for "safe" results, so tier colors (green/amber/
red) actually stand out. Space Grotesk for headings, Inter for body text.
Tokens live in `tailwind.config.js`.
