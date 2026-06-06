import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileWatchlistRepository, type WatchlistRepository } from "./repository";
import { rerankAll } from "./rankingService";
import type { NewWatchlistItem } from "./repository";

let tempDir: string;
let repository: WatchlistRepository;
let originalLlmKey: string | undefined;

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
  originalLlmKey = process.env.LLM_API_KEY;
  delete process.env.LLM_API_KEY;
  tempDir = await mkdtemp(path.join(os.tmpdir(), "mywatchlist-ranking-"));
  repository = createFileWatchlistRepository(path.join(tempDir, "watchlist.json"));
});

afterEach(async () => {
  if (originalLlmKey === undefined) {
    delete process.env.LLM_API_KEY;
  } else {
    process.env.LLM_API_KEY = originalLlmKey;
  }
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
});
