import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

interface OpenAIResponsesPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenAIUsageFile {
  month: string;
  requests: number;
  estimated_usd: number;
  input_tokens: number;
  output_tokens: number;
  updated_at: string;
}

const watchlistConfigDir = path.join(process.cwd(), "config", "watchlist");
const openAIUsageFilePath = path.join(process.cwd(), "data", "openai-ranking-usage.json");
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5-nano";
const DEFAULT_INPUT_USD_PER_MILLION = 0.05;
const DEFAULT_OUTPUT_USD_PER_MILLION = 0.4;

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
        "Ranked by the built-in local ranker",
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
  const parsed = JSON.parse(clean) as RankedResult[] | { rankings?: RankedResult[] };
  const rawRankings = Array.isArray(parsed) ? parsed : parsed.rankings;
  if (!Array.isArray(rawRankings)) {
    throw new Error("OpenAI ranking response did not contain a rankings array.");
  }
  return rawRankings.map((item) => ({
    id: String(item.id),
    rank_score: Math.max(0, Math.min(100, Math.round(Number(item.rank_score)))),
    rank_reason: String(item.rank_reason)
  }));
}

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function currentUsageMonth(now: Date) {
  return now.toISOString().slice(0, 7);
}

function usageFilePath() {
  return openAIUsageFilePath;
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function estimatedOpenAICost(inputTokens: number, outputTokens: number) {
  const inputRate = envNumber("OPENAI_RANKING_INPUT_USD_PER_MILLION", DEFAULT_INPUT_USD_PER_MILLION);
  const outputRate = envNumber("OPENAI_RANKING_OUTPUT_USD_PER_MILLION", DEFAULT_OUTPUT_USD_PER_MILLION);
  return (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate;
}

function truncate(value: string | undefined, maxChars: number) {
  if (!value) {
    return undefined;
  }
  return value.length > maxChars ? `${value.slice(0, maxChars)}...` : value;
}

function compactItemForOpenAI(item: WatchlistItem) {
  return {
    id: item.id,
    title: item.title,
    media_type: item.media_type,
    year: item.release_year,
    genres: item.genres,
    overview: truncate(item.overview, 700),
    scores: {
      tmdb: item.tmdb_score,
      imdb: item.imdb_score,
      tomatometer: item.tomatometer_score,
      popcornmeter: item.popcornmeter_score
    },
    note: truncate(item.note, 500),
    created_at: item.created_at,
    tara_interested: item.tara_interested,
    status: item.status
  };
}

async function readOpenAIUsage(now: Date): Promise<OpenAIUsageFile> {
  const month = currentUsageMonth(now);
  if (process.env.OPENAI_RANKING_RECORD_USAGE === "false") {
    return {
      month,
      requests: 0,
      estimated_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
      updated_at: now.toISOString()
    };
  }
  try {
    const raw = await readFile(usageFilePath(), "utf8");
    const parsed = JSON.parse(raw) as OpenAIUsageFile;
    if (parsed.month === month) {
      return parsed;
    }
  } catch {
    // Missing or malformed local usage files should not block fallback ranking.
  }
  return {
    month,
    requests: 0,
    estimated_usd: 0,
    input_tokens: 0,
    output_tokens: 0,
    updated_at: now.toISOString()
  };
}

async function recordOpenAIUsage(now: Date, inputTokens: number, outputTokens: number) {
  if (process.env.OPENAI_RANKING_RECORD_USAGE === "false") {
    return;
  }
  const filePath = usageFilePath();
  const existing = await readOpenAIUsage(now);
  const next: OpenAIUsageFile = {
    month: currentUsageMonth(now),
    requests: existing.requests + 1,
    estimated_usd: Number((existing.estimated_usd + estimatedOpenAICost(inputTokens, outputTokens)).toFixed(6)),
    input_tokens: existing.input_tokens + inputTokens,
    output_tokens: existing.output_tokens + outputTokens,
    updated_at: now.toISOString()
  };
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  } catch {
    // App Hosting instances can have ephemeral filesystems; platform-level budgets remain the hard stop.
  }
}

function extractOutputText(payload: OpenAIResponsesPayload) {
  if (payload.output_text) {
    return payload.output_text;
  }
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join("");
}

function ensureCompleteRankings(items: WatchlistItem[], ranked: RankedResult[]) {
  const expectedIds = new Set(items.map((item) => item.id));
  const rankedIds = new Set(ranked.map((item) => item.id));
  if (ranked.length !== items.length) {
    throw new Error("OpenAI ranking response did not rank every item.");
  }
  for (const id of expectedIds) {
    if (!rankedIds.has(id)) {
      throw new Error(`OpenAI ranking response omitted item ${id}.`);
    }
  }
  return ranked.filter((item) => expectedIds.has(item.id));
}

function rankingSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["rankings"],
    properties: {
      rankings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "rank_score", "rank_reason"],
          properties: {
            id: { type: "string" },
            rank_score: { type: "number", minimum: 0, maximum: 100 },
            rank_reason: { type: "string" }
          }
        }
      }
    }
  };
}

async function rankWithOpenAI(
  items: WatchlistItem[],
  config: RankingConfig,
  mode: RankingMode,
  now: Date
): Promise<RankedResult[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.OPENAI_RANKING_ENABLED !== "true") {
    return null;
  }
  const maxItems = Math.floor(envNumber("OPENAI_RANKING_MAX_ITEMS", 40));
  if (items.length > maxItems) {
    return null;
  }
  const maxOutputTokens = Math.floor(envNumber("OPENAI_RANKING_MAX_OUTPUT_TOKENS", 900));
  const prompt = {
    user_profile: config.userProfile,
    ranking_instructions: config.rankingInstructions,
    current_date: now.toISOString(),
    mode,
    items: items.map(compactItemForOpenAI)
  };
  const promptText = JSON.stringify(prompt);
  const maxInputChars = Math.floor(envNumber("OPENAI_RANKING_MAX_INPUT_CHARS", 24_000));
  if (promptText.length > maxInputChars) {
    return null;
  }
  const estimatedInputTokens = estimateTokens(promptText);
  const projectedCost = estimatedOpenAICost(estimatedInputTokens, maxOutputTokens);
  const monthlyBudget = envNumber("OPENAI_RANKING_MONTHLY_BUDGET_USD", 0.25);
  const currentUsage = await readOpenAIUsage(now);
  if (currentUsage.estimated_usd + projectedCost > monthlyBudget) {
    return null;
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_RANKING_MODEL ?? DEFAULT_OPENAI_MODEL,
      // gpt-5 reasoning models spend output tokens on hidden reasoning before the JSON.
      // Without this they routinely blow past max_output_tokens, truncating the JSON so the
      // result is discarded and we fall back to local ranking after already paying. "minimal"
      // keeps reasoning near zero so the structured JSON fits the budget reliably.
      reasoning: { effort: process.env.OPENAI_RANKING_REASONING_EFFORT ?? "minimal" },
      input: [
        {
          role: "system",
          content:
            "You rank a private movie and series watchlist. Return JSON only. Rank every provided item exactly once."
        },
        {
          role: "user",
          content: promptText
        }
      ],
      max_output_tokens: maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name: "watchlist_rankings",
          strict: true,
          schema: rankingSchema()
        }
      },
      metadata: {
        feature: "watchlist_ranking",
        mode,
        media_type: items[0]?.media_type ?? "unknown"
      }
    })
  });

  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as OpenAIResponsesPayload;
  await recordOpenAIUsage(
    now,
    payload.usage?.input_tokens ?? estimatedInputTokens,
    payload.usage?.output_tokens ?? maxOutputTokens
  );
  const content = extractOutputText(payload);
  if (!content) {
    return null;
  }
  try {
    return ensureCompleteRankings(items, extractJsonArray(content));
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
    const llmRanked = await rankWithOpenAI(group, config, mode, now);
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
