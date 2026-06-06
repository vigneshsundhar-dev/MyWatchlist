import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NOTE_MIN_LENGTH } from "./constants";
import type { MediaType, WatchlistDataFile, WatchlistItem, WatchStatus } from "./types";

const dataFileSchema = z.object({
  items: z.array(z.any()),
  updated_at: z.string()
});

export class WatchlistValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WatchlistValidationError";
  }
}

const allowedTransitions: Record<WatchStatus, WatchStatus[]> = {
  want_to_watch: ["watched", "abandoned"],
  watched: ["want_to_watch"],
  abandoned: ["want_to_watch"]
};

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

export type NewWatchlistItem = Omit<WatchlistItem, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

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

  function validateNote(note: string) {
    if (note.trim().length < NOTE_MIN_LENGTH) {
      throw new WatchlistValidationError(`Note must be at least ${NOTE_MIN_LENGTH} characters.`);
    }
  }

  function assertTransition(from: WatchStatus, to: WatchStatus) {
    if (from === to) {
      return;
    }
    if (!allowedTransitions[from].includes(to)) {
      throw new WatchlistValidationError(`Unsupported status transition: ${from} to ${to}`);
    }
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
      validateNote(input.note);
      const now = new Date().toISOString();
      const item: WatchlistItem = {
        ...input,
        id: input.id ?? randomUUID(),
        status: input.status ?? "want_to_watch",
        media_type: input.media_type as MediaType,
        note: input.note.trim(),
        tara_interested: input.tara_interested ?? false,
        created_at: input.created_at ?? now,
        updated_at: input.updated_at ?? now
      };
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
      if (patch.note !== undefined) {
        validateNote(patch.note);
      }
      if (patch.status !== undefined) {
        assertTransition(existing.status, patch.status);
      }
      const now = new Date().toISOString();
      const next = items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              note: patch.note?.trim() ?? item.note,
              updated_at: now
            }
          : item
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
      assertTransition(item.status, "watched");
      return repository.updateItem(id, {
        status: "watched",
        watched_at: new Date().toISOString(),
        watched_note: watchedNote?.trim() || undefined
      });
    },

    async abandon(id: string) {
      const item = await requireItem(id);
      assertTransition(item.status, "abandoned");
      return repository.updateItem(id, {
        status: "abandoned",
        abandoned_at: new Date().toISOString()
      });
    },

    async restore(id: string) {
      const item = await requireItem(id);
      assertTransition(item.status, "want_to_watch");
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

export const watchlistRepository = createFileWatchlistRepository();
