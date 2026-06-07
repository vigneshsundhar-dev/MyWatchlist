import { redirect } from "next/navigation";
import { watchlistPath } from "@/lib/watchlist/routes";

export default function HomePage() {
  redirect(watchlistPath());
}
