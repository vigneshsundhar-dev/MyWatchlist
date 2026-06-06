import { ExternalLink } from "lucide-react";
import { generateProviderLinks } from "@/lib/watchlist/providerSearchLinkService";
import type { WatchlistItem } from "@/lib/watchlist/types";

export function ProviderSearchButtons({
  item,
  compact = false
}: Readonly<{
  item: Pick<WatchlistItem, "title" | "release_year" | "media_type">;
  compact?: boolean;
}>) {
  const links = generateProviderLinks(item);
  return (
    <div className="provider-row">
      {links.map((link) => (
        <a
          className={compact ? "icon-btn" : "btn blue"}
          href={link.url}
          key={link.key}
          target="_blank"
          rel="noreferrer"
          title={link.label}
          aria-label={link.label}
        >
          <ExternalLink size={compact ? 15 : 16} aria-hidden />
          {!compact ? link.label : null}
        </a>
      ))}
    </div>
  );
}
