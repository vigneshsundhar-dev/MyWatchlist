"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { NOTE_MIN_LENGTH } from "@/lib/watchlist/constants";
import type { MediaSearchResult } from "@/lib/watchlist/types";
import { formatYear, mediaTypeLabel } from "@/lib/watchlist/format";
import { watchlistItemPath } from "@/lib/watchlist/routes";
import { Poster } from "./Poster";

export function AddItemForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [selected, setSelected] = useState<MediaSearchResult | null>(null);
  const [note, setNote] = useState("");
  const [taraInterested, setTaraInterested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/watchlist/search?q=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as { results?: MediaSearchResult[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Search failed.");
      }
      setResults(payload.results ?? []);
      setSelected(null);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function addItem(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      setError("Select a movie or series.");
      return;
    }
    if (note.trim().length < NOTE_MIN_LENGTH) {
      setError(`Note must be at least ${NOTE_MIN_LENGTH} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/watchlist/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected,
          note,
          tara_interested: taraInterested
        })
      });
      const payload = (await response.json()) as { item?: { id: string }; error?: string };
      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "Unable to add item.");
      }
      router.push(watchlistItemPath(payload.item.id));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="form-panel">
      <form className="panel card-body" onSubmit={search}>
        <label className="label">
          Search title
          <div className="search-row">
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} required />
            <button className="btn primary" disabled={loading || query.trim().length < 2} type="submit">
              <Search size={16} aria-hidden />
              Search
            </button>
          </div>
        </label>
      </form>

      {results.length > 0 ? (
        <section className="results-grid">
          {results.map((result) => (
            <button
              className={`result ${selected?.id === result.id ? "selected" : ""}`}
              key={result.id}
              onClick={() => setSelected(result)}
              type="button"
            >
              <Poster src={result.poster_url} title={result.title} />
              <span>
                <strong>{result.title}</strong>
                <br />
                <span className="muted">{mediaTypeLabel(result.media_type)} · {formatYear(result.release_year)}</span>
              </span>
            </button>
          ))}
        </section>
      ) : null}

      <form className="panel card-body" onSubmit={addItem}>
        <label className="label">
          Selected item
          <input className="input" readOnly value={selected ? `${selected.title} (${mediaTypeLabel(selected.media_type)})` : ""} />
        </label>
        <label className="label">
          Personal note
          <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} minLength={NOTE_MIN_LENGTH} required />
        </label>
        <label className="btn">
          <input checked={taraInterested} onChange={(event) => setTaraInterested(event.target.checked)} type="checkbox" />
          Tara interested
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" disabled={!selected || submitting || note.trim().length < NOTE_MIN_LENGTH} type="submit">
          Add to watchlist
        </button>
      </form>
    </section>
  );
}
