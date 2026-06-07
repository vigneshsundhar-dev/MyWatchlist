const DEFAULT_WATCHLIST_PATH = "/watchlist";

function normalizedBasePath() {
  const configured = process.env.NEXT_PUBLIC_WATCHLIST_BASE_PATH?.trim() || DEFAULT_WATCHLIST_PATH;
  if (!configured.startsWith("/")) {
    return `/${configured}`;
  }
  return configured.endsWith("/") && configured.length > 1 ? configured.slice(0, -1) : configured;
}

export function watchlistPath(suffix = "") {
  const base = normalizedBasePath();
  if (!suffix) {
    return base;
  }
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

export function watchlistItemPath(id: string) {
  return watchlistPath(`/item/${id}`);
}
