import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFileWatchlistRepository, type WatchlistRepository } from "./repository";
import { rerankAll } from "./rankingService";
import type { NewWatchlistItem } from "./repository";

let tempDir: string;
let repository: WatchlistRepository;
let originalEnv: NodeJS.ProcessEnv;

function item(overrides: Partial<NewWatchlistItem>): NewWatchlistItem {
  return {
    media_type: "movie",
    status: "want_to_watch",
    title: "Test Item",
    note: "A strong personal reason to watch this.",
    tara_interested: false,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

beforeEach(async () => {
  originalEnv = { ...process.env };
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_RANKING_ENABLED;
  tempDir = await mkdtemp(path.join(os.tmpdir(), "mywatchlist-ranking-"));
  process.env.OPENAI_RANKING_RECORD_USAGE = "false";
  repository = createFileWatchlistRepository(path.join(tempDir, "watchlist.json"));
});

afterEach(async () => {
  process.env = originalEnv;
  vi.restoreAllMocks();
  await rm(tempDir, { recursive: true, force: true });
});

describe("rerankAll", () => {
  it("ranks only active items and assigns positions per media type", async () => {
    const movieA = await repository.createItem(
      item({
        title: "Layered Thriller",
        genres: ["Thriller"],
        imdb_score: 8.4,
        note: "Looks like a clever thriller with strong reviews.",
        created_at: "2025-01-01T00:00:00.000Z"
      })
    );
    const movieB = await repository.createItem(
      item({
        title: "Recent Drama",
        genres: ["Drama"],
        tmdb_score: 7.1,
        note: "Recommended as an emotionally intelligent drama.",
        created_at: "2026-05-01T00:00:00.000Z"
      })
    );
    const series = await repository.createItem(
      item({
        media_type: "series",
        title: "Philosophical Series",
        note: "Tara said she wants to watch this sci-fi series.",
        tara_interested: true
      })
    );
    const watched = await repository.createItem(
      item({
        title: "Already Watched",
        note: "Classic already watched."
      })
    );
    await repository.markWatched(watched.id);

    const ranked = await rerankAll({
      repository,
      now: new Date("2026-06-01T00:00:00.000Z")
    });

    expect(ranked.map((rankedItem) => rankedItem.id).sort()).toEqual([movieA.id, movieB.id, series.id].sort());
    const allItems = await repository.getAllItems();
    const rankedMovieA = allItems.find((candidate) => candidate.id === movieA.id);
    const rankedMovieB = allItems.find((candidate) => candidate.id === movieB.id);
    const rankedSeries = allItems.find((candidate) => candidate.id === series.id);
    const watchedItem = allItems.find((candidate) => candidate.id === watched.id);

    expect(rankedMovieA?.rank_position).toBeGreaterThanOrEqual(1);
    expect(rankedMovieB?.rank_position).toBeGreaterThanOrEqual(1);
    expect(rankedMovieA?.rank_position).not.toBe(rankedMovieB?.rank_position);
    expect(rankedSeries?.rank_position).toBe(1);
    expect(rankedSeries?.rank_reason).toContain("local fallback");
    expect(rankedSeries?.ranking_context_hash).toHaveLength(64);
    expect(watchedItem?.rank_position).toBeUndefined();
  });

  it("uses OpenAI Responses API when explicitly enabled", async () => {
    const created = await repository.createItem(
      item({
        title: "Careful Thriller",
        note: "A clever thriller that should fit the ranking profile."
      })
    );
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_RANKING_ENABLED = "true";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            rankings: [
              {
                id: created.id,
                rank_score: 96,
                rank_reason: "Strong fit with the profile and a clear personal note."
              }
            ]
          }),
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await rerankAll({
      repository,
      now: new Date("2026-06-01T00:00:00.000Z")
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("gpt-5-nano");
    expect(body.max_output_tokens).toBe(900);
    expect(body.text.format.type).toBe("json_schema");
    const ranked = await repository.getItem(created.id);
    expect(ranked?.rank_score).toBe(96);
    expect(ranked?.rank_reason).toBe("Strong fit with the profile and a clear personal note.");
  });

  it("falls back without calling OpenAI when local monthly budget would be exceeded", async () => {
    const created = await repository.createItem(
      item({
        title: "Budget Guarded Film",
        note: "A thoughtful film that should rank locally when budget is exhausted."
      })
    );
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_RANKING_ENABLED = "true";
    process.env.OPENAI_RANKING_MONTHLY_BUDGET_USD = "0.000001";
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await rerankAll({
      repository,
      now: new Date("2026-06-01T00:00:00.000Z")
    });

    expect(fetchMock).not.toHaveBeenCalled();
    const ranked = await repository.getItem(created.id);
    expect(ranked?.rank_reason).toContain("local fallback");
  });
});
