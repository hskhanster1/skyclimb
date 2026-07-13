# Deployment Guide

**Status:** Phase 11
**Note on scope:** I can prepare the codebase to be deployment-ready and give exact steps, but I can't create hosting accounts or click through a provider's UI on your behalf — that part needs to happen in your own browser. Everything below is written so there's no guesswork once you get there.

## What's already done

- `server.js` now reads `PORT` from the environment (`process.env.PORT || 3000`) instead of hardcoding 3000 — required for every platform below, since they all assign a port dynamically. Verified locally by starting the server with `PORT=4321` set and confirming it actually listens there.
- `ALLOWED_ORIGIN` is already read from the environment (Phase 8/R5) — just needs setting once you know your deployed URL.
- `render.yaml` is included at the project root as a one-click deploy blueprint for Render specifically.

## Recommended: Render

Render was picked as the primary target because of the included blueprint, but Railway and Fly.io work almost identically (see below).

1. **Push this repo to GitHub** if it isn't already there.
2. Go to render.com and sign up / log in (GitHub sign-in is easiest, since you'll be connecting a repo anyway).
3. **New → Blueprint**, and select this repository. Render will detect `render.yaml` automatically and pre-fill the service configuration (Node runtime, `npm install`, `npm start`).
4. Deploy. Render will build and start the service, and give you a URL like `https://skyclimb-xxxx.onrender.com`.
5. **Set the real origin.** Go to the service's Environment settings and change `ALLOWED_ORIGIN` from `*` to the exact URL Render just gave you (e.g. `https://skyclimb-xxxx.onrender.com`, no trailing slash). Redeploy for it to take effect.
6. Open that URL. HTTPS is automatic — Render terminates TLS at its edge, and since the client connects with `io()` (no hardcoded URL, same-origin by design from Phase 2), it automatically upgrades to `wss://` with no client code changes needed.

## Alternative: Railway

Same shape, no blueprint file needed since Railway auto-detects Node projects:

1. Push to GitHub, then in Railway: **New Project → Deploy from GitHub repo**.
2. Railway auto-detects `npm start` from `package.json`. No build command changes needed.
3. Railway assigns `PORT` automatically — already handled by the code fix above.
4. Add an environment variable: `ALLOWED_ORIGIN` = your Railway-assigned domain, once you know it.
5. HTTPS is automatic, same reasoning as Render.

## Alternative: Fly.io

Slightly more manual (requires the `flyctl` CLI):

1. `flyctl launch` from the project root — it'll detect the Node app and generate a `fly.toml`. Accept the default port detection (it reads your app listening on `process.env.PORT`, same as above).
2. `flyctl secrets set ALLOWED_ORIGIN=https://your-app.fly.dev` once you know your assigned domain.
3. `flyctl deploy`.

## Post-deploy checklist

- [ ] Visit the deployed URL — the title screen should load (confirms Express static serving works)
- [ ] Try **Local** mode — confirms the client bundle loaded correctly
- [ ] Try **Online** mode from two separate browser tabs (or two devices) using the same room code — confirms Socket.IO is reachable over `wss://` and the full join → gameStart → state flow works in the deployed environment, not just locally
- [ ] Confirm `ALLOWED_ORIGIN` was updated from the `*` default and the app still works after that change

## Known limitations of a free-tier deployment (worth knowing, not blockers)

- **Room state is in-memory only** (Architecture.md already notes this as a scaling constraint). On a free tier, the service spins down after a period of inactivity — any active rooms are lost when that happens, and the next visitor triggers a cold start. Fine for a portfolio demo; would need an external store (e.g. Redis) if this ever needed to survive restarts.
- **The `server/logs/events.log` file (R8) is also not guaranteed to persist** on most free tiers — their disks are typically ephemeral across restarts/redeploys unless you pay for a persistent volume. For anything beyond local development, the hosting provider's own live log dashboard (Render and Railway both have one) is the practical way to see these events; the file-based logging remains genuinely useful for local testing, just not as a durable production audit trail as currently configured.
