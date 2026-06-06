import { NextResponse } from "next/server";
import { z } from "zod";
import { rerankAll } from "@/lib/watchlist/rankingService";
import { mediaTypes } from "@/lib/watchlist/types";

export const runtime = "nodejs";

const rerankSchema = z.object({
  mode: z.enum(["default", "with_tara"]).default("default"),
  mediaType: z.enum(mediaTypes).optional()
});

export async function POST(request: Request) {
  try {
    const body = rerankSchema.parse(await request.json().catch(() => ({})));
    const items = await rerankAll({ mode: body.mode, mediaType: body.mediaType });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to re-rank items." },
      { status: 500 }
    );
  }
}
