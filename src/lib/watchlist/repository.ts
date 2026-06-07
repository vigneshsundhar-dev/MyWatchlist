import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createFirestoreWatchlistRepository } from "./repositoryFirestore";
import {
  applyWatchlistPatch,
  assertWatchStatusTransition,
  createWatchlistItemFromInput,
  WatchlistValidationError
} from "./repositoryCore";
import type { NewWatchlistItem } from "./repositoryCore";
import type { WatchlistDataFile, WatchlistItem } from "./types";

export { WatchlistValidationError };
export type { NewWatchlistItem };

const dataFileSchema = z.object({
  items: z.array(z.any()),
  updated_at: z.string()
});

export interface WatchlistRepository {
  getAllItems(): Promise<WatchlistItem[]>;
  getItem(id: string): Promise<WatchlistItem | null>;
  createItem(input: NewWatchlistItem): Promise<WatchlistItem>;
  updateItem(id: string, patch: Partial<WatchlistItem>): Promise<WatchlistItem>;
  replaceItems(items: WatchlistItem[]): Promise<WatchlistItem[]>;
  markWatched(id: string, watchedNote?: string): Promise<WatchlistItem>;
  abandon(id: string): Promise<WatchlistItem>;
  restore(id: string): Promise<WatchlistItem>;
}

export function defaultWatchlistFilePath() {
  return path.join(process.cwd(), "data", "watchlist.json");
}

export function createFileWatchlistRepository(filePath = defaultWatchlistFilePath()): WatchlistRepository {
  async function readData(): Promise<WatchlistDataFile> {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = dataFileSchema.parse(JSON.parse(raw));
      return parsed as WatchlistDataFile;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { items: [], updated_at: new Date().toISOString() };
      }
      throw error;
    }
  }

  async function writeData(items: WatchlistItem[]): Promise<WatchlistItem[]> {
    const next: WatchlistDataFile = {
      items,
      updated_at: new Date().toISOString()
    };
    await mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);
    return next.items;
  }

  async function requireItem(id: string): Promise<WatchlistItem> {
    const item = await repository.getItem(id);
    if (!item) {
      throw new WatchlistValidationError(`Watchlist item not found: ${id}`);
    }
    return item;
  }

  const repository: WatchlistRepository = {
    async getAllItems() {
      const data = await readData();
      return data.items;
    },

    async getItem(id: string) {
      const data = await readData();
      return data.items.find((item) => item.id === id) ?? null;
    },

    async createItem(input: NewWatchlistItem) {
      const item = createWatchlistItemFromInput(input);
      const items = await repository.getAllItems();
      await writeData([item, ...items]);
      return item;
    },

    async updateItem(id: string, patch: Partial<WatchlistItem>) {
      const items = await repository.getAllItems();
      const existing = items.find((item) => item.id === id);
      if (!existing) {
        throw new WatchlistValidationError(`Watchlist item not found: ${id}`);
      }
      const updatedItem = applyWatchlistPatch(existing, patch);
      const next = items.map((item) =>
        item.id === id ? updatedItem : item
      );
      await writeData(next);
      const updated = next.find((item) => item.id === id);
      if (!updated) {
        throw new WatchlistValidationError(`Watchlist item not found after update: ${id}`);
      }
      return updated;
    },

    async replaceItems(items: WatchlistItem[]) {
      return writeData(items.map((item) => ({ ...item, updated_at: item.updated_at ?? new Date().toISOString() })));
    },

    async markWatched(id: string, watchedNote?: string) {
      const item = await requireItem(id);
      assertWatchStatusTransition(item.status, "watched");
      return repository.updateItem(id, {
        status: "watched",
        watched_at: new Date().toISOString(),
        watched_note: watchedNote?.trim() || undefined
      });
    },

    async abandon(id: string) {
      const item = await requireItem(id);
      assertWatchStatusTransition(item.status, "abandoned");
      return repository.updateItem(id, {
        status: "abandoned",
        abandoned_at: new Date().toISOString()
      });
    },

    async restore(id: string) {
      const item = await requireItem(id);
      assertWatchStatusTransition(item.status, "want_to_watch");
      return repository.updateItem(id, {
        status: "want_to_watch",
        watched_at: undefined,
        watched_note: undefined,
        abandoned_at: undefined
      });
    }
  };

  return repository;
}

export function createConfiguredWatchlistRepository(): WatchlistRepository {
  if (process.env.WATCHLIST_STORAGE === "firebase") {
    return createFirestoreWatchlistRepository();
  }
  return createFileWatchlistRepository();
}

export const watchlistRepository = createConfiguredWatchlistRepository();
