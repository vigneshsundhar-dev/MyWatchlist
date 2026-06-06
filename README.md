# MyWatchlist

Personal, local-first watchlist app for deciding what movie or series to watch next.

The source PRD lives in [docs/PRD.md](docs/PRD.md). Implementation stories are tracked in GitHub issues and summarized in [docs/STORIES.md](docs/STORIES.md).

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
- `LLM_API_KEY`: LLM ranking.

When `LLM_API_KEY` is not configured, the ranking service uses a deterministic local fallback so tests and local UI flows remain runnable.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
