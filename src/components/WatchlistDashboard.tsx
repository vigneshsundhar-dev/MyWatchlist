"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Film, Plus, RefreshCw, SlidersHorizontal, Tv } from "lucide-react";
import { formatDate, formatYear, mediaTypeLabel, scoreLabel, statusLabel } from "@/lib/watchlist/format";
import type { MediaType, WatchStatus, WatchlistItem } from "@/lib/watchlist/types";
import { Poster } from "./Poster";
import { ProviderSearchButtons } from "./ProviderSearchButtons";
import { StatusControls } from "./StatusControls";

function rankedSort(a: WatchlistItem, b: WatchlistItem) {
  return (a.rank_position ?? 9999) - (b.rank_position ?? 9999) || a.title.localeCompare(b.title);
}

function historicalSort(a: WatchlistItem, b: WatchlistItem) {
  const aDate = a.watched_at ?? a.abandoned_at ?? a.updated_at;
  const bDate = b.watched_at ?? b.abandoned_at ?? b.updated_at;
  return new Date(bDate).getTime() - new Date(aDate).getTime();
}

function scores(item: WatchlistItem) {
  return [
    scoreLabel("IMDb", item.imdb_score),
    scoreLabel("RT", item.tomatometer_score),
    scoreLabel("Popcorn", item.popcornmeter_score),
    scoreLabel("TMDb", item.tmdb_score)
  ].filter(Boolean);
}

function ItemMeta({ item }: Readonly<{ item: WatchlistItem }>) {
  return (
    <div className="score-row">
      <span className="type-pill">{mediaTypeLabel(item.media_type)}</span>
      <span className="score">{formatYear(item.release_year)}</span>
      {item.tara_interested ? <span className="score">Tara</span> : null}
      {scores(item).map((score) => (
        <span className="score" key={score}>
          {score}
        </span>
      ))}
    </div>
  );
}

function NoteModal({
  item,
  onClose
}: Readonly<{
  item: WatchlistItem;
  onClose: () => void;
}>) {
  return (
    <div className="note-popover" role="dialog" aria-modal="true" onClick={onClose}>
      <article onClick={(event) => event.stopPropagation()}>
        <div className="card-title">
          <h2>{item.title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close note">
            ×
          </button>
        </div>
        <p>{item.note}</p>
      </article>
    </div>
  );
}

function HeroCard({ item, onShowNote }: Readonly<{ item: WatchlistItem; onShowNote: (item: WatchlistItem) => void }>) {
  return (
    <article className="card hero-card">
      <Poster src={item.poster_url} title={item.title} />
      <div className="card-body">
        <div className="card-title">
          <h2>{item.title}</h2>
          <span className="rank-pill">#{item.rank_position ?? "?"}</span>
        </div>
        <ItemMeta item={item} />
        <p className="muted">{item.rank_reason ?? "Not ranked yet."}</p>
        <div className="actions">
          <button className="btn" onClick={() => onShowNote(item)}>
            <FileText size={16} aria-hidden />
            Note
          </button>
          <Link className="btn" href={`/watchlist/item/${item.id}`}>
            Details
          </Link>
        </div>
        <StatusControls item={item} />
        <ProviderSearchButtons item={item} />
      </div>
    </article>
  );
}

function ListCard({ item, onShowNote }: Readonly<{ item: WatchlistItem; onShowNote: (item: WatchlistItem) => void }>) {
  return (
    <article className="card list-card">
      <Poster src={item.poster_url} title={item.title} />
      <div className="card-body">
        <div className="card-title">
          <h3>
            #{item.rank_position ?? "?"} {item.title}
          </h3>
          <StatusControls item={item} compact />
        </div>
        <ItemMeta item={item} />
        <p className="muted">{item.rank_reason ?? item.overview ?? "No ranking reason yet."}</p>
        <div className="actions">
          <button className="btn" onClick={() => onShowNote(item)}>
            <FileText size={16} aria-hidden />
            Note
          </button>
          <Link className="btn" href={`/watchlist/item/${item.id}`}>
            Details
          </Link>
          <ProviderSearchButtons item={item} compact />
        </div>
      </div>
    </article>
  );
}

export function WatchlistDashboard({ items }: Readonly<{ items: WatchlistItem[] }>) {
  const router = useRouter();
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [status, setStatus] = useState<WatchStatus>("want_to_watch");
  const [withTara, setWithTara] = useState(false);
  const [noteItem, setNoteItem] = useState<WatchlistItem | null>(null);
  const [reranking, setReranking] = useState(false);

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => item.media_type === mediaType)
      .filter((item) => item.status === status)
      .filter((item) => (withTara ? item.tara_interested : true))
      .sort(status === "want_to_watch" ? rankedSort : historicalSort);
  }, [items, mediaType, status, withTara]);

  const heroItems = status === "want_to_watch" ? visibleItems.slice(0, 5) : [];
  const listItems = status === "want_to_watch" ? visibleItems.slice(5) : visibleItems;

  async function rerank() {
    setReranking(true);
    try {
      const response = await fetch("/api/watchlist/rerank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaType, mode: withTara ? "with_tara" : "default" })
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to re-rank items.");
      }
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to re-rank items.");
    } finally {
      setReranking(false);
    }
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Watch Now</h1>
          <p>{visibleItems.length} {statusLabel(status).toLowerCase()} {mediaType === "movie" ? "movies" : "series"}</p>
        </div>
        <Link className="btn primary" href="/watchlist/add">
          <Plus size={17} aria-hidden />
          Add item
        </Link>
      </div>

      <section className="toolbar" aria-label="Watchlist filters">
        <div className="toolbar-group">
          <div className="segmented">
            <button className={`tab-btn ${mediaType === "movie" ? "active" : ""}`} onClick={() => setMediaType("movie")}>
              <Film size={16} aria-hidden />
              Movies
            </button>
            <button className={`tab-btn ${mediaType === "series" ? "active" : ""}`} onClick={() => setMediaType("series")}>
              <Tv size={16} aria-hidden />
              Series
            </button>
          </div>
          <label className="btn">
            <input checked={withTara} onChange={(event) => setWithTara(event.target.checked)} type="checkbox" />
            With Tara
          </label>
          <label className="inline-row">
            <SlidersHorizontal size={16} aria-hidden />
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value as WatchStatus)}>
              <option value="want_to_watch">Want to Watch</option>
              <option value="watched">Watched</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </label>
        </div>
        <button className="btn" disabled={reranking} onClick={rerank}>
          <RefreshCw size={16} aria-hidden />
          Re-rank all
        </button>
      </section>

      {heroItems.length > 0 ? (
        <>
          <div className="section-title">
            <h2>Top 5</h2>
          </div>
          <section className="hero-strip">
            {heroItems.map((item) => (
              <HeroCard item={item} key={item.id} onShowNote={setNoteItem} />
            ))}
          </section>
        </>
      ) : null}

      <div className="section-title">
        <h2>{status === "want_to_watch" ? "Ranked List" : statusLabel(status)}</h2>
      </div>
      <section className="list">
        {listItems.length > 0 ? (
          listItems.map((item) => <ListCard item={item} key={item.id} onShowNote={setNoteItem} />)
        ) : (
          <div className="panel card-body empty">
            No items match the current view.
          </div>
        )}
      </section>

      {noteItem ? <NoteModal item={noteItem} onClose={() => setNoteItem(null)} /> : null}
    </>
  );
}
