# AGENTS.md

> Shared context for AI agents working in this repository. **Multiple AI agents
> work on MyWatchlist.** Treat this file (and the docs it points to) as the
> single source of truth for cross-agent context. If you learn something durable
> that other agents will need, record it here or in the linked docs — not only in
> your own private/session memory, which other agents cannot see.

## Status: PRODUCTION IS LIVE

The app is deployed and serving real users at **https://vigneshsundhar.com/mywatchlist**
(live since 2026-06-07). Treat production as real: changes to `main` can reach it.
Full deployment topology is in [docs/DEVOPS.md](docs/DEVOPS.md#production-deployment-live).

## Working agreements (must follow)

- **Create issues anytime.** When you find a bug, gap, or improvement, open a
  GitHub issue immediately (`gh issue create`). Not gated on shipping.
- **Change issue status only when work goes live.** Close/move an issue only when
  its work is deployed to production — not when it merely works locally.
- **Nothing deploys unless Vignesh explicitly says `deploy`.** Local-first by default.
- If automatic rollouts are enabled on the App Hosting backend, **pushing to `main`
  deploys to production.** Be deliberate about what you push.

## Where shared context lives

- [README.md](README.md) — overview, local dev, working agreements.
- [docs/PRD.md](docs/PRD.md) — product requirements.
- [docs/DEVOPS.md](docs/DEVOPS.md) — deploy plumbing + live production topology.
- [docs/STORIES.md](docs/STORIES.md) — implementation stories.
- GitHub issues — current work and backlog.

## Key facts

- Local dev uses `data/watchlist.json`; **production uses Firestore** (`watchlist_items`).
- OpenAI ranking is **disabled in production** (free deterministic local ranker).
  See issues #21 / #22 for ranking hardening and scoring-system redesign.
- TMDb calls go through `TMDB_API_BASE_URL` (default `api.themoviedb.org`); some
  networks reset that host, so `api.tmdb.org` is used as the reachable equivalent.
