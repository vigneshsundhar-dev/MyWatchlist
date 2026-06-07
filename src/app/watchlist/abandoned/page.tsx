import Link from "next/link";
import { AppFrame } from "@/components/AppFrame";
import { Poster } from "@/components/Poster";
import { StatusControls } from "@/components/StatusControls";
import { formatDate, formatYear, mediaTypeLabel } from "@/lib/watchlist/format";
import { watchlistRepository } from "@/lib/watchlist/repository";
import { watchlistItemPath } from "@/lib/watchlist/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AbandonedPage() {
  const items = (await watchlistRepository.getAllItems())
    .filter((item) => item.status === "abandoned")
    .sort((a, b) => new Date(b.abandoned_at ?? b.updated_at).getTime() - new Date(a.abandoned_at ?? a.updated_at).getTime());

  return (
    <AppFrame>
      <div className="page-title">
        <div>
          <h1>Abandoned</h1>
          <p>{items.length} abandoned items</p>
        </div>
      </div>
      <section className="list">
        {items.length > 0 ? (
          items.map((item) => (
            <article className="card list-card" key={item.id}>
              <Poster src={item.poster_url} title={item.title} />
              <div className="card-body">
                <div className="card-title">
                  <h3>{item.title}</h3>
                  <StatusControls item={item} compact />
                </div>
                <div className="score-row">
                  <span className="type-pill">{mediaTypeLabel(item.media_type)}</span>
                  <span className="score">{formatYear(item.release_year)}</span>
                  <span className="score">{formatDate(item.abandoned_at)}</span>
                </div>
                <p className="muted">{item.rank_reason ?? item.overview}</p>
                <Link className="btn" href={watchlistItemPath(item.id)}>
                  Details
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="panel card-body empty">No abandoned items.</div>
        )}
      </section>
    </AppFrame>
  );
}
