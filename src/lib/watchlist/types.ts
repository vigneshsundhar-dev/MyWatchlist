export const mediaTypes = ["movie", "series"] as const;
export type MediaType = (typeof mediaTypes)[number];

export const watchStatuses = ["want_to_watch", "watched", "abandoned"] as const;
export type WatchStatus = (typeof watchStatuses)[number];

export type RankingMode = "default" | "with_tara";

export type MetadataConfidence = "high" | "medium" | "low";

export interface MetadataSources {
  tmdb?: {
    tmdb_id: string;
    fetched_at: string;
  };
  omdb?: {
    imdb_id?: string;
    fetched_at: string;
  };
  enrichment?: {
    provider: "llm_web_search";
    fetched_at: string;
    source_urls: string[];
    confidence: MetadataConfidence;
  };
  rt_scores?: {
    source: "omdb" | "llm_web_search" | "manual";
    confidence: MetadataConfidence;
    fetched_at: string;
    source_urls?: string[];
  };
}

export interface WatchlistItem {
  id: string;
  media_type: MediaType;
  status: WatchStatus;
  title: string;
  original_title?: string;
  release_year?: number;
  tmdb_id?: string;
  imdb_id?: string;
  poster_url?: string;
  backdrop_url?: string;
  overview?: string;
  genres?: string[];
  runtime_minutes?: number;
  tmdb_score?: number;
  imdb_score?: number;
  tomatometer_score?: number;
  popcornmeter_score?: number;
  note: string;
  tara_interested: boolean;
  rank_score?: number;
  rank_position?: number;
  rank_reason?: string;
  ranked_at?: string;
  ranking_context_hash?: string;
  metadata_sources?: MetadataSources;
  watched_at?: string;
  watched_note?: string;
  abandoned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaSearchResult {
  id: string;
  tmdb_id: string;
  media_type: MediaType;
  title: string;
  original_title?: string;
  release_year?: number;
  poster_url?: string;
  overview?: string;
  tmdb_score?: number;
}

export interface ProviderSearchLink {
  key: "netflix" | "prime_video" | "jiohotstar" | "apple_tv" | "youtube" | "google";
  label:
    | "Search Netflix"
    | "Search Prime"
    | "Search JioHotstar"
    | "Search Apple TV"
    | "Search YouTube"
    | "Search Google";
  url: string;
}

export interface WatchlistDataFile {
  items: WatchlistItem[];
  updated_at: string;
}
