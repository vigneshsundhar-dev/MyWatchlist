import Link from "next/link";
import { Archive, Film, History, Plus } from "lucide-react";
import { watchlistPath } from "@/lib/watchlist/routes";

export function AppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href={watchlistPath()}>
            <span className="brand-mark">
              <Film size={18} aria-hidden />
            </span>
            <span>MyWatchlist</span>
          </Link>
          <nav className="nav-links" aria-label="Watchlist navigation">
            <Link className="btn" href={watchlistPath("/add")}>
              <Plus size={16} aria-hidden />
              Add
            </Link>
            <Link className="btn" href={watchlistPath("/history")}>
              <History size={16} aria-hidden />
              History
            </Link>
            <Link className="btn" href={watchlistPath("/abandoned")}>
              <Archive size={16} aria-hidden />
              Abandoned
            </Link>
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
