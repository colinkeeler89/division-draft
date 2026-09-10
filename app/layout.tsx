import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { LATEST_SEASON } from "@/lib/pool";

export const metadata: Metadata = {
  title: "Division Draft — NFL Wins Pool",
  description:
    "Standings, rosters and eleven seasons of history for a four-manager NFL division-draft wins pool. Records update themselves from live NFL results.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="masthead">
          <div className="masthead-in">
            <div className="brand">
              <span className="brand-mark">Est. 2015</span>
              <Link href="/" className="brand-name">Division Draft</Link>
            </div>
            <nav className="navlinks">
              <Link className="navlink" href="/">{LATEST_SEASON} Standings</Link>
              <Link className="navlink" href="/history">All-Time</Link>
              <Link className="navlink" href="/analytics">Analytics</Link>
              <Link className="navlink" href={`/season/${LATEST_SEASON - 1}`}>Archive</Link>
            </nav>
          </div>
        </header>

        <main className="wrap">{children}</main>

        <div className="wrap" style={{ paddingBottom: 0 }}>
          <footer className="site">
            Results pulled automatically from{" "}
            <a href="https://github.com/nflverse/nfldata" target="_blank" rel="noreferrer">nflverse</a>{" "}
            and refreshed every 15 minutes. Nobody has to type a win into a spreadsheet ever again.
          </footer>
        </div>
      </body>
    </html>
  );
}
