"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, RotateCcw } from "lucide-react";
import type { WatchlistItem } from "@/lib/watchlist/types";

type Action = "mark_watched" | "abandon" | "restore";

export function StatusControls({
  item,
  compact = false
}: Readonly<{
  item: Pick<WatchlistItem, "id" | "status">;
  compact?: boolean;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);

  async function submit(action: Action) {
    let watched_note: string | undefined;
    if (action === "mark_watched") {
      if (!window.confirm("Mark this item as watched?")) {
        return;
      }
      watched_note = window.prompt("Watched note (optional)")?.trim() || undefined;
    }
    if (action === "abandon" && !window.confirm("Move this item to abandoned?")) {
      return;
    }
    setPending(action);
    try {
      const response = await fetch(`/api/watchlist/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, watched_note })
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to update item.");
      }
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to update item.");
    } finally {
      setPending(null);
    }
  }

  if (item.status === "want_to_watch") {
    return (
      <div className="actions">
        <button className={compact ? "icon-btn" : "btn primary"} disabled={Boolean(pending)} onClick={() => submit("mark_watched")} title="Mark watched">
          <Check size={16} aria-hidden />
          {!compact ? "Watched" : null}
        </button>
        <button className={compact ? "icon-btn" : "btn warning"} disabled={Boolean(pending)} onClick={() => submit("abandon")} title="Abandon">
          <Archive size={16} aria-hidden />
          {!compact ? "Abandon" : null}
        </button>
      </div>
    );
  }

  return (
    <button className={compact ? "icon-btn" : "btn"} disabled={Boolean(pending)} onClick={() => submit("restore")} title="Restore">
      <RotateCcw size={16} aria-hidden />
      {!compact ? "Restore" : null}
    </button>
  );
}
