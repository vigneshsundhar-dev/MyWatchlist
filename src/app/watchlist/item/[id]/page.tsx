import { notFound } from "next/navigation";
import { AppFrame } from "@/components/AppFrame";
import { Poster } from "@/components/Poster";
import { ProviderSearchButtons } from "@/components/ProviderSearchButtons";
import { StatusControls } from "@/components/StatusControls";
import { formatDate, formatYear, mediaTypeLabel, scoreLabel, statusLabel } from "@/lib/watchlist/format";
import { watchlistRepository } from "@/lib/watchlist/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const item = await watchlistRepository.getItem(id);
  if (!item) {
    notFound();
  }

  const scoreRows = [
    scoreLabel("IMDb", item.imdb_score),
    scoreLabel("Tomatometer", item.tomatometer_score),
    scoreLabel("Popcornmeter", item.popcornmeter_score),
    scoreLabel("TMDb", item.tmdb_score)
  ].filter(Boolean);

  return (
    <AppFrame>
      <div className="page-title">
        <div>
          <h1>{item.title}</h1>
          <p>
            {mediaTypeLabel(item.media_type)} · {formatYear(item.release_year)} · {statusLabel(item.status)}
          </p>
        </div>
        <StatusControls item={item} />
      </div>

      <div className="detail-grid">
        <section>
          <Poster src={item.poster_url} title={item.title} />
        </section>
        <section className="grid">
          <div className="score-row">
            {item.rank_position ? <span className="rank-pill">Rank #{item.rank_position}</span> : null}
            {item.rank_score !== undefined ? <span className="score">Score {item.rank_score}</span> : null}
            {item.tara_interested ? <span className="score">Tara</span> : null}
            {scoreRows.map((score) => (
              <span className="score" key={score}>
                {score}
              </span>
            ))}
          </div>
          {item.overview ? <p>{item.overview}</p> : null}
          <section className="panel card-body">
            <h2>Original Note</h2>
            <p>{item.note}</p>
          </section>
          <section className="panel card-body">
            <h2>Ranking Reason</h2>
            <p>{item.rank_reason ?? "Not ranked yet."}</p>
            {item.ranked_at ? <p className="muted">Ranked {formatDate(item.ranked_at)}</p> : null}
          </section>
          {item.watched_at ? (
            <section className="panel card-body">
              <h2>Watched</h2>
              <p>{formatDate(item.watched_at)}</p>
              {item.watched_note ? <p className="muted">{item.watched_note}</p> : null}
            </section>
          ) : null}
          <section className="panel card-body">
            <h2>Provider Search</h2>
            <ProviderSearchButtons item={item} />
          </section>
          <section className="panel card-body">
            <h2>Metadata Sources</h2>
            <pre className="metadata-json">{JSON.stringify(item.metadata_sources ?? {}, null, 2)}</pre>
          </section>
        </section>
      </div>
    </AppFrame>
  );
}
