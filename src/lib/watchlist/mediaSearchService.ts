import type { MediaSearchResult, MediaType } from "./types";

const TMDB_BASE_URL = process.env.TMDB_API_BASE_URL ?? "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342";

interface TmdbSearchItem {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;
}

export class MediaSearchConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaSearchConfigurationError";
  }
}

function releaseYear(value?: string) {
  if (!value) {
    return undefined;
  }
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

function posterUrl(path?: string | null) {
  return path ? `${TMDB_IMAGE_BASE_URL}${path}` : undefined;
}

function mapMediaType(tmdbType: TmdbSearchItem["media_type"]): MediaType | null {
  if (tmdbType === "movie") {
    return "movie";
  }
  if (tmdbType === "tv") {
    return "series";
  }
  return null;
}

export async function searchMedia(query: string): Promise<MediaSearchResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }
  if (!apiKey) {
    throw new MediaSearchConfigurationError("TMDB_API_KEY is required for media search.");
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    query: trimmedQuery,
    include_adult: "false",
    language: "en-US"
  });
  const response = await fetch(`${TMDB_BASE_URL}/search/multi?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`TMDb search failed with ${response.status}.`);
  }
  const payload = (await response.json()) as { results?: TmdbSearchItem[] };
  return (payload.results ?? [])
    .map((item): MediaSearchResult | null => {
      const mediaType = mapMediaType(item.media_type);
      if (!mediaType) {
        return null;
      }
      const title = mediaType === "movie" ? item.title : item.name;
      if (!title) {
        return null;
      }
      return {
        id: `${mediaType}-${item.id}`,
        tmdb_id: String(item.id),
        media_type: mediaType,
        title,
        original_title: mediaType === "movie" ? item.original_title : item.original_name,
        release_year: releaseYear(mediaType === "movie" ? item.release_date : item.first_air_date),
        poster_url: posterUrl(item.poster_path),
        overview: item.overview,
        tmdb_score: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined
      } satisfies MediaSearchResult;
    })
    .filter((item): item is MediaSearchResult => Boolean(item))
    .slice(0, 12);
}
