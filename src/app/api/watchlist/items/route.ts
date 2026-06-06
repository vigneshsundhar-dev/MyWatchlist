import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichMetadata } from "@/lib/watchlist/enrichmentService";
import { fetchMetadata } from "@/lib/watchlist/metadataService";
import { NOTE_MIN_LENGTH } from "@/lib/watchlist/constants";
import { watchlistRepository, WatchlistValidationError } from "@/lib/watchlist/repository";
import { rerankAll } from "@/lib/watchlist/rankingService";
import { mediaTypes } from "@/lib/watchlist/types";

export const runtime = "nodejs";

const createItemSchema = z.object({
  selected: z.object({
    tmdb_id: z.string(),
    media_type: z.enum(mediaTypes),
    title: z.string(),
    original_title: z.string().optional(),
    release_year: z.number().optional(),
    poster_url: z.string().optional(),
    overview: z.string().optional(),
    tmdb_score: z.number().optional()
  }),
  note: z.string().min(NOTE_MIN_LENGTH),
  tara_interested: z.boolean().default(false)
});

export async function GET() {
  const items = await watchlistRepository.getAllItems();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const body = createItemSchema.parse(await request.json());
    const metadata = await fetchMetadata(body.selected.media_type, body.selected.tmdb_id);
    const enriched = await enrichMetadata({ ...body.selected, ...metadata, note: body.note });
    const item = await watchlistRepository.createItem({
      status: "want_to_watch",
      ...body.selected,
      ...metadata,
      ...enriched,
      media_type: body.selected.media_type,
      tmdb_id: body.selected.tmdb_id,
      title: metadata.title ?? body.selected.title,
      note: body.note,
      tara_interested: body.tara_interested
    });
    await rerankAll({ mediaType: item.media_type });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const status = error instanceof WatchlistValidationError || error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create item." },
      { status }
    );
  }
}
