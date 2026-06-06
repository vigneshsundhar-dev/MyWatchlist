import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileWatchlistRepository, type WatchlistRepository } from "./repository";
import type { NewWatchlistItem } from "./repository";

let tempDir: string;
let repository: WatchlistRepository;

function newItem(overrides: Partial<NewWatchlistItem> = {}): NewWatchlistItem {
  return {
    media_type: "movie",
    status: "want_to_watch",
    title: "Arrival",
    release_year: 2016,
    note: "Thoughtful sci-fi I have meant to watch.",
    tara_interested: false,
    ...overrides
  };
}

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "mywatchlist-"));
  repository = createFileWatchlistRepository(path.join(tempDir, "watchlist.json"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("file watchlist repository", () => {
  it("requires a meaningful note before creating an item", async () => {
    await expect(repository.createItem(newItem({ note: "meh" }))).rejects.toThrow("Note must be at least");
  });

  it("creates items with default local-first fields", async () => {
    const item = await repository.createItem(newItem({ note: "Obama recommended this." }));

    expect(item.id).toBeTruthy();
    expect(item.status).toBe("want_to_watch");
    expect(item.note).toBe("Obama recommended this.");
    expect(item.created_at).toBeTruthy();
    expect(await repository.getItem(item.id)).toEqual(item);
  });

  it("supports PRD status transitions and blocks unsupported transitions", async () => {
    const item = await repository.createItem(newItem());
    const watched = await repository.markWatched(item.id, "Worth it.");

    expect(watched.status).toBe("watched");
    expect(watched.watched_note).toBe("Worth it.");
    await expect(repository.abandon(item.id)).rejects.toThrow("Unsupported status transition");

    const restored = await repository.restore(item.id);
    expect(restored.status).toBe("want_to_watch");
    expect(restored.watched_at).toBeUndefined();

    const abandoned = await repository.abandon(item.id);
    expect(abandoned.status).toBe("abandoned");
    expect(abandoned.abandoned_at).toBeTruthy();
  });
});
