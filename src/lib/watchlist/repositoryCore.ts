import { randomUUID } from "node:crypto";
import { NOTE_MIN_LENGTH } from "./constants";
import type { MediaType, WatchlistItem, WatchStatus } from "./types";

export type NewWatchlistItem = Omit<WatchlistItem, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

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

export function validateWatchlistNote(note: string) {
  if (note.trim().length < NOTE_MIN_LENGTH) {
    throw new WatchlistValidationError(`Note must be at least ${NOTE_MIN_LENGTH} characters.`);
  }
}

export function assertWatchStatusTransition(from: WatchStatus, to: WatchStatus) {
  if (from === to) {
    return;
  }
  if (!allowedTransitions[from].includes(to)) {
    throw new WatchlistValidationError(`Unsupported status transition: ${from} to ${to}`);
  }
}

export function createWatchlistItemFromInput(input: NewWatchlistItem, now = new Date().toISOString()): WatchlistItem {
  validateWatchlistNote(input.note);
  return {
    ...input,
    id: input.id ?? randomUUID(),
    status: input.status ?? "want_to_watch",
    media_type: input.media_type as MediaType,
    note: input.note.trim(),
    tara_interested: input.tara_interested ?? false,
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? now
  };
}

export function applyWatchlistPatch(
  existing: WatchlistItem,
  patch: Partial<WatchlistItem>,
  now = new Date().toISOString()
): WatchlistItem {
  if (patch.note !== undefined) {
    validateWatchlistNote(patch.note);
  }
  if (patch.status !== undefined) {
    assertWatchStatusTransition(existing.status, patch.status);
  }
  return {
    ...existing,
    ...patch,
    note: patch.note?.trim() ?? existing.note,
    updated_at: now
  };
}
