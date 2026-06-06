# Test Plan

## Automated

- Provider links generate search URLs with `Search` labels and never availability claims.
- Repository enforces mandatory notes and supported status transitions.
- Ranking service ranks active items per media type and ignores watched or abandoned items.
- Ranking service writes score, position, reason, timestamp, and context hash.

Run:

```bash
npm test
npm run typecheck
```

## Manual Local Checks

- `/watchlist/add`: search TMDb, select a movie or series, submit only when note has at least five characters.
- `/watchlist`: verify movie and series tabs, top-five hero stack, ranked list, Tara filter, note popover, provider search buttons, and re-rank button.
- Watched flow: confirm, add optional watched note, item leaves active list and appears in `/watchlist/history`.
- Abandoned flow: item leaves active list and appears in `/watchlist/abandoned`; restore returns it to active.
- `/watchlist/item/:id`: verify metadata, note, ranking reason, provider links, and metadata source JSON.
