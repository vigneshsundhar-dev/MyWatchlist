# MyWatchlist

Personal, local-first watchlist app for deciding what movie or series to watch next.

The source PRD lives in [docs/PRD.md](docs/PRD.md). Implementation stories are tracked in GitHub issues and summarized in [docs/STORIES.md](docs/STORIES.md).

Deployment plumbing is documented in [docs/DEVOPS.md](docs/DEVOPS.md). The app remains local-only unless Vignesh explicitly says `deploy`.

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
