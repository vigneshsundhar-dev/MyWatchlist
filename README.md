# MyWatchlist

Personal, local-first watchlist app for deciding what movie or series to watch next.

The source PRD lives in [docs/PRD.md](docs/PRD.md). Implementation stories are tracked in GitHub issues and summarized in [docs/STORIES.md](docs/STORIES.md).

Deployment plumbing is documented in [docs/DEVOPS.md](docs/DEVOPS.md). The app remains local-only unless Vignesh explicitly says `deploy`.

## Working Agreements (humans and AI assistants)

Issues for this project are tracked on GitHub (`gh issue ...`). Anyone working on the
codebase — including AI assistants — is expected to keep the tracker in sync per these rules:

- **Create issues anytime.** When a bug, gap, or improvement is discovered, open a GitHub
  issue for it immediately. This is not gated on shipping anything — capture it as soon as
  it surfaces, even mid-task.
- **Change issue status only when work goes live.** Move an issue to done / closed (or
  otherwise update its status) only when the corresponding work is **taken live** — i.e.
  deployed/merged to production, not merely implemented or working locally. Local progress
  and experiments do not change issue status.
- Use `gh issue list`, `gh issue create`, `gh issue close`, etc. Cross-link related issues
  by number (e.g. `#21`).

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000/watchlist](http://localhost:3000/watchlist).

The app stores local data in `data/watchlist.json`, which is ignored by git. Nothing is deployed unless explicitly requested.

## Required API Keys

- `TMDB_API_KEY`: TMDb search and metadata.
- `OMDB_API_KEY`: IMDb and Rotten Tomatoes metadata fallback where OMDb returns it.
- `OPENAI_API_KEY`: OpenAI ranking.

When `OPENAI_RANKING_ENABLED` is not `true`, the ranking service uses a deterministic local fallback so tests and local UI flows remain runnable without spending API credits.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
