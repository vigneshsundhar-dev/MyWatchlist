import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyWatchlist",
  description: "Personal ranked movie and series watchlist"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
