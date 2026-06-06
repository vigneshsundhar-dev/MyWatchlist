import { NextResponse } from "next/server";
import { z } from "zod";
import { watchlistRepository, WatchlistValidationError } from "@/lib/watchlist/repository";
import { rerankAll } from "@/lib/watchlist/rankingService";

export const runtime = "nodejs";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("mark_watched"),
    watched_note: z.string().optional()
  }),
  z.object({
    action: z.literal("abandon")
  }),
  z.object({
    action: z.literal("restore")
  })
]);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = await watchlistRepository.getItem(id);
  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = patchSchema.parse(await request.json());
    let item;
    if (body.action === "mark_watched") {
      item = await watchlistRepository.markWatched(id, body.watched_note);
    } else if (body.action === "abandon") {
      item = await watchlistRepository.abandon(id);
    } else {
      item = await watchlistRepository.restore(id);
    }
    await rerankAll({ mediaType: item.media_type });
    return NextResponse.json({ item });
  } catch (error) {
    const status = error instanceof WatchlistValidationError || error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update item." },
      { status }
    );
  }
}
