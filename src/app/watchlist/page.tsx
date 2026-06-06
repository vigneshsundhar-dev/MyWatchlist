import { AppFrame } from "@/components/AppFrame";
import { WatchlistDashboard } from "@/components/WatchlistDashboard";
import { watchlistRepository } from "@/lib/watchlist/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const items = await watchlistRepository.getAllItems();
  return (
    <AppFrame>
      <WatchlistDashboard items={items} />
    </AppFrame>
  );
}
