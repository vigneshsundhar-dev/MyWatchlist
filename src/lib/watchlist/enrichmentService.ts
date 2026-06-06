import type { WatchlistItem } from "./types";

export async function enrichMetadata(_item: Partial<WatchlistItem>): Promise<Partial<WatchlistItem>> {
  if (!process.env.WEB_SEARCH_API_KEY) {
    return {};
  }

  // The MVP deliberately avoids guessing enriched fields. Wire a web-search provider here
  // only when source URLs and confidence can be stored with the returned values.
  return {};
}
