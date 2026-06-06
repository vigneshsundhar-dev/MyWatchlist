import type { ProviderSearchLink, WatchlistItem } from "./types";

function searchQuery(item: Pick<WatchlistItem, "title" | "release_year" | "media_type">) {
  if (item.media_type === "series") {
    return `${item.title} series`;
  }
  return [item.title, item.release_year].filter(Boolean).join(" ");
}

function encoded(item: Pick<WatchlistItem, "title" | "release_year" | "media_type">) {
  return encodeURIComponent(searchQuery(item));
}

export function generateProviderLinks(
  item: Pick<WatchlistItem, "title" | "release_year" | "media_type">
): ProviderSearchLink[] {
  const query = encoded(item);
  return [
    {
      key: "netflix",
      label: "Search Netflix",
      url: `https://www.netflix.com/search?q=${query}`
    },
    {
      key: "prime_video",
      label: "Search Prime",
      url: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`
    },
    {
      key: "jiohotstar",
      label: "Search JioHotstar",
      url: `https://www.hotstar.com/in/search?q=${query}`
    },
    {
      key: "apple_tv",
      label: "Search Apple TV",
      url: `https://tv.apple.com/search?term=${query}`
    },
    {
      key: "youtube",
      label: "Search YouTube",
      url: `https://www.youtube.com/results?search_query=${query}`
    },
    {
      key: "google",
      label: "Search Google",
      url: `https://www.google.com/search?q=${query}`
    }
  ];
}
