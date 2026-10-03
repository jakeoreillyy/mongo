# Phalanx dashboard

Landing page and live dashboard for Phalanx. Vite, React, TypeScript, Tailwind.

```sh
npm install
npm run dev        # http://localhost:5173
```

- `/` is the landing page. The hero replays the demo script from `PHALANX-SPLIT.md` on a loop.
- `/?view=dashboard` is the detailed operator view.
- Add `?live` to either to read from the real API instead of the replay. The dev server proxies `/api` to `API_TARGET` (default `http://localhost:4000`, where both A's server and B's stub run), so the API does not need CORS. See `.env.example`.

Live mode seeds from `GET /claims` and then follows `GET /events` (server-sent events). It understands the event types in the contract: `claimed`, `released`, `blocked`, `decision`, `warning`, `waiting`, `woken`.

The team setup flow on the landing page is simulated. It does not call GitHub, Discord or Slack.
