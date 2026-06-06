import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MediaType, RankingMode, WatchlistItem } from "./types";
import { watchlistRepository, type WatchlistRepository } from "./repository";

interface RankingOptions {
  mode?: RankingMode;
  mediaType?: MediaType;
  repository?: WatchlistRepository;
  now?: Date;
}

interface RankedResult {
  id: string;
  rank_score: number;
  rank_reason: string;
}

interface RankingConfig {
  userProfile: string;
  rankingInstructions: string;
}

const watchlistConfigDir = path.join(process.cwd(), "config", "watchlist");

async function readConfigFile(filename: "user-profile.md" | "ranking-instructions.md") {
  return readFile(path.join(watchlistConfigDir, filename), "utf8");
}

export async function loadRankingConfig(): Promise<RankingConfig> {
  const [userProfile, rankingInstructions] = await Promise.all([
    readConfigFile("user-profile.md"),
    readConfigFile("ranking-instructions.md")
  ]);
  return { userProfile, rankingInstructions };
}

function contextHash(config: RankingConfig, items: WatchlistItem[], mode: RankingMode, mediaType: MediaType) {
  const payload = {
    config,
    mode,
    mediaType,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      media_type: item.media_type,
      release_year: item.release_year,
      genres: item.genres,
      scores: {
        tmdb: item.tmdb_score,
        imdb: item.imdb_score,
        tomatometer: item.tomatometer_score,
        popcornmeter: item.popcornmeter_score
      },
      note: item.note,
      created_at: item.created_at,
      tara_interested: item.tara_interested
    }))
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function monthsWaiting(item: WatchlistItem, now: Date) {
  const createdAt = new Date(item.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    return 0;
  }
  return Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

function scoreMetadata(item: WatchlistItem) {
  const imdb = item.imdb_score ? item.imdb_score * 4 : 0;
  const tmdb = item.tmdb_score ? item.tmdb_score * 3 : 0;
  const tomato = item.tomatometer_score ? item.tomatometer_score / 4 : 0;
  const popcorn = item.popcornmeter_score ? item.popcornmeter_score / 6 : 0;
  return Math.min(28, imdb + tmdb + tomato + popcorn);
}

function scoreTasteFit(item: WatchlistItem, config: RankingConfig) {
  const profile = `${config.userProfile} ${config.rankingInstructions}`.toLowerCase();
  const haystack = `${item.title} ${item.overview ?? ""} ${(item.genres ?? []).join(" ")} ${item.note}`.toLowerCase();
  const tasteTerms = [
    "layered",
    "emotional",
    "thriller",
    "philosophical",
    "sci-fi",
    "science fiction",
    "character",
    "drama",
    "inventive",
    "classic",
    "acclaimed"
  ];
  return tasteTerms.reduce((score, term) => {
    if (profile.includes(term) && haystack.includes(term)) {
      return score + 2;
    }
    return score;
  }, 0);
}

function fallbackRank(items: WatchlistItem[], config: RankingConfig, mode: RankingMode, now: Date): RankedResult[] {
  return items
    .map((item) => {
      const ageBoost = Math.min(15, monthsWaiting(item, now) * 1.5);
      const noteBoost = Math.min(12, item.note.trim().length / 18);
      const metadataBoost = scoreMetadata(item);
      const tasteBoost = Math.min(16, scoreTasteFit(item, config));
      const taraBoost = item.tara_interested ? (mode === "with_tara" ? 18 : 4) : 0;
      const score = Math.max(0, Math.min(100, 34 + ageBoost + noteBoost + metadataBoost + tasteBoost + taraBoost));
      const reasonParts = [
        "Ranked from the local fallback because LLM ranking is not configured",
        noteBoost >= 8 ? "the note shows clear personal intent" : "the note provides watch intent",
        metadataBoost >= 18 ? "metadata has strong quality signals" : "metadata provides some quality signal",
        ageBoost >= 8 ? "it has been waiting long enough to deserve a boost" : "recency does not dominate the rank"
      ];
      if (item.tara_interested) {
        reasonParts.push(mode === "with_tara" ? "Tara interest is strongly weighted" : "Tara interest adds a small signal");
      }
      return {
        id: item.id,
        rank_score: Math.round(score),
        rank_reason: `${reasonParts.join(", ")}.`
      };
    })
    .sort((a, b) => b.rank_score - a.rank_score);
}

function extractJsonArray(content: string): RankedResult[] {
  const clean = content.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as RankedResult[];
  if (!Array.isArray(parsed)) {
    throw new Error("LLM ranking response was not an array.");
  }
  return parsed.map((item) => ({
    id: String(item.id),
    rank_score: Math.max(0, Math.min(100, Math.round(Number(item.rank_score)))),
    rank_reason: String(item.rank_reason)
  }));
}

async function rankWithLlm(
  items: WatchlistItem[],
  config: RankingConfig,
  mode: RankingMode,
  now: Date
): Promise<RankedResult[] | null> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return null;
  }
  const url = process.env.LLM_API_URL ?? "https://api.openai.com/v1/chat/completions";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const prompt = {
    user_profile: config.userProfile,
    ranking_instructions: config.rankingInstructions,
    current_date: now.toISOString(),
    mode,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      media_type: item.media_type,
      year: item.release_year,
      genres: item.genres,
      overview: item.overview,
      scores: {
        tmdb: item.tmdb_score,
        imdb: item.imdb_score,
        tomatometer: item.tomatometer_score,
        popcornmeter: item.popcornmeter_score
      },
      note: item.note,
      created_at: item.created_at,
      tara_interested: item.tara_interested,
      status: item.status
    }))
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You rank a private movie and series watchlist. Return structured JSON only: an array of { id, rank_score, rank_reason }."
        },
        {
          role: "user",
          content: JSON.stringify(prompt)
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    output_text?: string;
  };
  const content = payload.choices?.[0]?.message?.content ?? payload.output_text;
  if (!content) {
    return null;
  }
  try {
    return extractJsonArray(content);
  } catch {
    return null;
  }
}

function mergeRankings(items: WatchlistItem[], ranked: RankedResult[], rankedAt: string, hash: string): WatchlistItem[] {
  const byId = new Map(ranked.map((rank) => [rank.id, rank]));
  return items
    .map((item) => {
      const ranking = byId.get(item.id);
      if (!ranking) {
        return item;
      }
      return {
        ...item,
        rank_score: ranking.rank_score,
        rank_reason: ranking.rank_reason,
        ranked_at: rankedAt,
        ranking_context_hash: hash
      };
    })
    .sort((a, b) => (b.rank_score ?? 0) - (a.rank_score ?? 0))
    .map((item, index) => ({
      ...item,
      rank_position: index + 1
    }));
}

export async function rerankAll(options: RankingOptions = {}): Promise<WatchlistItem[]> {
  const repository = options.repository ?? watchlistRepository;
  const mode = options.mode ?? "default";
  const now = options.now ?? new Date();
  const config = await loadRankingConfig();
  const allItems = await repository.getAllItems();
  const mediaTypes: MediaType[] = options.mediaType ? [options.mediaType] : ["movie", "series"];
  const nextItems = [...allItems];
  const rankedItems: WatchlistItem[] = [];

  for (const mediaType of mediaTypes) {
    const group = nextItems.filter((item) => item.status === "want_to_watch" && item.media_type === mediaType);
    if (group.length === 0) {
      continue;
    }
    const hash = contextHash(config, group, mode, mediaType);
    const llmRanked = await rankWithLlm(group, config, mode, now);
    const ranked = llmRanked ?? fallbackRank(group, config, mode, now);
    const rankedAt = now.toISOString();
    const mergedGroup = mergeRankings(group, ranked, rankedAt, hash);
    rankedItems.push(...mergedGroup);
    for (const rankedItem of mergedGroup) {
      const index = nextItems.findIndex((item) => item.id === rankedItem.id);
      if (index >= 0) {
        nextItems[index] = {
          ...rankedItem,
          updated_at: rankedAt
        };
      }
    }
  }

  await repository.replaceItems(nextItems);
  return rankedItems.sort((a, b) => {
    if (a.media_type !== b.media_type) {
      return a.media_type.localeCompare(b.media_type);
    }
    return (a.rank_position ?? 999) - (b.rank_position ?? 999);
  });
}
