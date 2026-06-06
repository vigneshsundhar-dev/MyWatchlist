import type { MediaType, WatchStatus } from "./types";

export function mediaTypeLabel(mediaType: MediaType) {
  return mediaType === "movie" ? "Movie" : "Series";
}

export function statusLabel(status: WatchStatus) {
  const labels: Record<WatchStatus, string> = {
    want_to_watch: "Want to Watch",
    watched: "Watched",
    abandoned: "Abandoned"
  };
  return labels[status];
}

export function formatDate(value?: string) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function formatYear(value?: number) {
  return value ? String(value) : "Unknown year";
}

export function scoreLabel(label: string, value?: number) {
  if (value === undefined || value === null) {
    return null;
  }
  return `${label} ${value}`;
}
