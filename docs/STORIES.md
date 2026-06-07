# Implementation Stories

GitHub issues are the source of truth for status. This file keeps the PRD-to-story split visible in the repo.

## MVP Stories

1. [#1](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/1) Project foundation, PRD, local-only policy, and test harness. Closed in initial baseline.
2. [#2](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/2) Unified watchlist data model with local persistence. Closed in initial baseline.
3. [#3](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/3) TMDb search and metadata services with OMDb score fallback. Closed in initial baseline.
4. [#4](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/4) Add flow with mandatory personal note and Tara interest flag. Closed in initial baseline.
5. [#5](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/5) Watch Now screen with movie/series tabs, filters, hero stack, and ranked list. Closed in initial baseline.
6. [#6](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/6) Status transitions for watched, abandoned, and restore flows. Closed in initial baseline.
7. [#7](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/7) Provider search links that never claim availability. Closed in initial baseline.
8. [#8](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/8) Ranking config files and LLM-backed ranking service with local test fallback. Closed in initial baseline.
9. [#9](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/9) Item detail, metadata source visibility, watched history, and abandoned views. Closed in initial baseline.
10. [#10](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/10) Automated test coverage for acceptance-critical services and flows. Closed in initial baseline.

## Backlog Stories

1. [#11](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/11) Tara sync surface inside `tara.vigneshsundhar.com`. Open.
2. [#12](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/12) Manual metadata override. Open.
3. [#13](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/13) Better streaming availability integration. Open.
4. [#14](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/14) Scheduled re-ranking. Open.
5. [#15](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/15) Browser extension or share sheet add flow. Open.

## DevOps Stories

1. [#16](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/16) Firebase App Hosting and Firestore production plumbing. Closed in DevOps plumbing pass.
2. [#17](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/17) Cloudflare `/mywatchlist` path proxy plumbing. Closed in DevOps plumbing pass.
3. [#18](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/18) OpenAI-only ranking hardening and spend controls. Closed in DevOps plumbing pass.
4. [#19](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/19) Credential runbook and CI verification. Closed in DevOps plumbing pass.
5. [#20](https://github.com/vigneshsundhar-dev/MyWatchlist/issues/20) Create Firebase backend, set secrets, and activate Cloudflare routes. Open, blocked until explicit `deploy`.
