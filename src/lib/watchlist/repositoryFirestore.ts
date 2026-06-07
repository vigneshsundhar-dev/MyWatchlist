import type { WriteBatch } from "firebase-admin/firestore";
import { getAdminFirestore } from "./firebaseAdmin";
import {
  applyWatchlistPatch,
  assertWatchStatusTransition,
  createWatchlistItemFromInput,
  WatchlistValidationError
} from "./repositoryCore";
import type { NewWatchlistItem } from "./repositoryCore";
import type { WatchlistItem } from "./types";
import type { WatchlistRepository } from "./repository";

function collectionName() {
  return process.env.FIRESTORE_COLLECTION || "watchlist_items";
}

function cleanForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collection() {
  return getAdminFirestore().collection(collectionName());
}

async function commitInChunks(items: WatchlistItem[]) {
  const db = getAdminFirestore();
  let batch: WriteBatch = db.batch();
  let operationCount = 0;

  async function flush() {
    if (operationCount > 0) {
      await batch.commit();
    }
    batch = db.batch();
    operationCount = 0;
  }

  for (const item of items) {
    batch.set(collection().doc(item.id), cleanForFirestore(item));
    operationCount += 1;
    if (operationCount === 450) {
      await flush();
    }
  }
  await flush();
}

export function createFirestoreWatchlistRepository(): WatchlistRepository {
  async function requireItem(id: string): Promise<WatchlistItem> {
    const item = await repository.getItem(id);
    if (!item) {
      throw new WatchlistValidationError(`Watchlist item not found: ${id}`);
    }
    return item;
  }

  const repository: WatchlistRepository = {
    async getAllItems() {
      const snapshot = await collection().get();
      return snapshot.docs
        .map((doc) => doc.data() as WatchlistItem)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    async getItem(id: string) {
      const snapshot = await collection().doc(id).get();
      if (!snapshot.exists) {
        return null;
      }
      return snapshot.data() as WatchlistItem;
    },

    async createItem(input: NewWatchlistItem) {
      const item = createWatchlistItemFromInput(input);
      await collection().doc(item.id).set(cleanForFirestore(item));
      return item;
    },

    async updateItem(id: string, patch: Partial<WatchlistItem>) {
      const existing = await requireItem(id);
      const updated = applyWatchlistPatch(existing, patch);
      await collection().doc(id).set(cleanForFirestore(updated));
      return updated;
    },

    async replaceItems(items: WatchlistItem[]) {
      const updatedAt = new Date().toISOString();
      const nextItems = items.map((item) => ({ ...item, updated_at: item.updated_at ?? updatedAt }));
      await commitInChunks(nextItems);
      return nextItems;
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
