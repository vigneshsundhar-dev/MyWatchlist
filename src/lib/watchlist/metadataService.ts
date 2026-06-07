import type { MediaType, MetadataSources, WatchlistItem } from "./types";

const TMDB_BASE_URL = process.env.TMDB_API_BASE_URL ?? "https://api.themoviedb.org/3";
const TMDB_IMAGE_ORIGINAL = "https://image.tmdb.org/t/p/original";
const TMDB_IMAGE_POSTER = "https://image.tmdb.org/t/p/w500";

interface TmdbGenre {
  name: string;
}

interface TmdbDetails {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  genres?: TmdbGenre[];
  runtime?: number;
  episode_run_time?: number[];
  vote_average?: number;
  external_ids?: {
    imdb_id?: string;
  };
}

interface OmdbPayload {
  Response?: "True" | "False";
  imdbRating?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
}

function yearFromDate(date?: string) {
  if (!date) {
    return undefined;
  }
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

function imageUrl(base: string, value?: string | null) {
  return value ? `${base}${value}` : undefined;
}

function parseScore(value?: string) {
  if (!value || value === "N/A") {
    return undefined;
  }
  const score = Number(value);
  return Number.isFinite(score) ? score : undefined;
}

function parsePercent(value?: string) {
  if (!value || value === "N/A") {
    return undefined;
  }
  const score = Number(value.replace("%", ""));
  return Number.isFinite(score) ? score : undefined;
}

async function fetchTmdbDetails(mediaType: MediaType, tmdbId: string): Promise<TmdbDetails> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is required for metadata fetch.");
  }
  const resource = mediaType === "movie" ? "movie" : "tv";
  const params = new URLSearchParams({
    api_key: apiKey,
    append_to_response: "external_ids",
    language: "en-US"
  });
  const response = await fetch(`${TMDB_BASE_URL}/${resource}/${tmdbId}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`TMDb details failed with ${response.status}.`);
  }
  return (await response.json()) as TmdbDetails;
}

async function fetchOmdb(imdbId?: string): Promise<Partial<WatchlistItem> & { sources?: MetadataSources }> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey || !imdbId) {
    return {};
  }
  const params = new URLSearchParams({
    apikey: apiKey,
    i: imdbId
  });
  const response = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
  if (!response.ok) {
    return {};
  }
  const payload = (await response.json()) as OmdbPayload;
  if (payload.Response !== "True") {
    return {};
  }
  const rt = payload.Ratings?.find((rating) => rating.Source === "Rotten Tomatoes");
  const now = new Date().toISOString();
  const imdbScore = parseScore(payload.imdbRating);
  const tomatometerScore = parsePercent(rt?.Value);
  return {
    imdb_score: imdbScore,
    tomatometer_score: tomatometerScore,
    sources: {
      omdb: { imdb_id: imdbId, fetched_at: now },
      rt_scores: tomatometerScore
        ? {
            source: "omdb",
            confidence: "high",
            fetched_at: now
          }
        : undefined
    }
  };
}

export async function fetchMetadata(mediaType: MediaType, tmdbId: string): Promise<Partial<WatchlistItem>> {
  const tmdb = await fetchTmdbDetails(mediaType, tmdbId);
  const imdbId = tmdb.external_ids?.imdb_id;
  const omdb = await fetchOmdb(imdbId);
  const now = new Date().toISOString();
  const sources: MetadataSources = {
    tmdb: {
      tmdb_id: String(tmdb.id),
      fetched_at: now
    },
    ...(omdb.sources ?? {})
  };

  return {
    media_type: mediaType,
    title: mediaType === "movie" ? tmdb.title : tmdb.name,
    original_title: mediaType === "movie" ? tmdb.original_title : tmdb.original_name,
    release_year: yearFromDate(mediaType === "movie" ? tmdb.release_date : tmdb.first_air_date),
    tmdb_id: String(tmdb.id),
    imdb_id: imdbId,
    poster_url: imageUrl(TMDB_IMAGE_POSTER, tmdb.poster_path),
    backdrop_url: imageUrl(TMDB_IMAGE_ORIGINAL, tmdb.backdrop_path),
    overview: tmdb.overview,
    genres: tmdb.genres?.map((genre) => genre.name).filter(Boolean),
    runtime_minutes: mediaType === "movie" ? tmdb.runtime : tmdb.episode_run_time?.[0],
    tmdb_score: tmdb.vote_average ? Number(tmdb.vote_average.toFixed(1)) : undefined,
    imdb_score: omdb.imdb_score,
    tomatometer_score: omdb.tomatometer_score,
    metadata_sources: sources
  };
}
