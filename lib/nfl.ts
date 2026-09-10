import { teamFromAbbr } from "./teams";

/**
 * Source of truth: nflverse.
 *
 *  - `standings.csv` (~56 KB) carries season W/L/T for every team back to 2002 and
 *    is pre-seeded with the upcoming season at 0-0-0. This drives every number the
 *    site reports. It is small enough for Next's data cache, so a page rebuild is
 *    one cheap request.
 *
 *  - `games.csv` (~2.9 MB) carries every individual game since 1999. It is used for
 *    exactly one thing — drawing the week-by-week race line — and is fetched lazily.
 *    If it fails or is slow, the chart is skipped and every number on the page is
 *    still correct, because the numbers never come from this file.
 *
 * Both files are free, keyless, CDN-served, and updated automatically through the
 * season. Swapping providers means changing this file and nothing else.
 */
const STANDINGS_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/standings.csv";
const GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";

/** How long Vercel may serve a cached copy before re-fetching, in seconds. */
export const REVALIDATE_SECONDS = 900; // 15 minutes

export type Record3 = { w: number; l: number; t: number };

export type Game = {
  season: number;
  week: number;
  type: string;
  date: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
};

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/** Minimal RFC-4180 reader — handles quoted fields containing commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); field = ""; rows.push(row); row = []; continue; }
    if (c === "\r") continue;
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === null || v.trim() === "" || v.toUpperCase() === "NA") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function headerIndex(header: string[], required: string[], label: string) {
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i])) as Record<string, number>;
  for (const r of required) {
    if (idx[r] === undefined) throw new Error(`nflverse ${label} schema changed: missing column "${r}"`);
  }
  return idx;
}

/* ------------------------------------------------------------------ */
/* Standings — the primary feed                                        */
/* ------------------------------------------------------------------ */

export type StandingsTable = Map<number, Map<string, Record3>>;

export async function fetchStandings(): Promise<StandingsTable> {
  const res = await fetch(STANDINGS_URL, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { "User-Agent": "nfl-division-pool" },
  });
  if (!res.ok) throw new Error(`nflverse standings fetch failed: ${res.status} ${res.statusText}`);

  const rows = parseCsv(await res.text());
  const idx = headerIndex(rows[0], ["season", "team", "wins", "losses", "ties"], "standings");

  const out: StandingsTable = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 5) continue;
    const season = num(row[idx.season]);
    if (season === null) continue;
    let abbr: string;
    try { abbr = teamFromAbbr(row[idx.team]).abbr; } catch { continue; }
    const bucket = out.get(season) ?? new Map<string, Record3>();
    bucket.set(abbr, {
      w: num(row[idx.wins]) ?? 0,
      l: num(row[idx.losses]) ?? 0,
      t: num(row[idx.ties]) ?? 0,
    });
    out.set(season, bucket);
  }
  return out;
}

/**
 * Never let a network hiccup fail a deploy.
 *
 * Every page prerenders at build time, so an exception thrown while fetching
 * takes the whole Vercel build down with it — the site stops deploying because
 * GitHub's CDN blinked. Pages use this instead: on failure they get an empty
 * table and an `ok: false` they can render a notice for, and the next
 * revalidation (15 minutes) picks the data back up on its own.
 */
export async function fetchStandingsSafe(): Promise<{ table: StandingsTable; ok: boolean }> {
  try {
    return { table: await fetchStandings(), ok: true };
  } catch {
    return { table: new Map(), ok: false };
  }
}

/* ------------------------------------------------------------------ */
/* Games — used only for the weekly race line                          */
/* ------------------------------------------------------------------ */

/**
 * Process-level memo. Building all twelve season pages would otherwise pull the
 * 2.9 MB file twelve times; Next refuses to put anything over 2 MB in its own data
 * cache, so we hold it here for the life of the render instead.
 */
let gamesMemo: { at: number; games: Game[] } | null = null;
const MEMO_MS = REVALIDATE_SECONDS * 1000;

export async function fetchGames(season?: number): Promise<Game[]> {
  if (gamesMemo && Date.now() - gamesMemo.at < MEMO_MS) {
    return season === undefined ? gamesMemo.games : gamesMemo.games.filter((g) => g.season === season);
  }
  const res = await fetch(GAMES_URL, {
    // Longer window: this file is big and only feeds a chart.
    next: { revalidate: REVALIDATE_SECONDS * 2 },
    headers: { "User-Agent": "nfl-division-pool" },
  });
  if (!res.ok) throw new Error(`nflverse games fetch failed: ${res.status} ${res.statusText}`);

  const rows = parseCsv(await res.text());
  const idx = headerIndex(
    rows[0],
    ["season", "week", "game_type", "gameday", "home_team", "away_team", "home_score", "away_score"],
    "games",
  );

  const games: Game[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 8) continue;
    const s = num(row[idx.season]);
    if (s === null || s < 2015) continue;
    if (row[idx.game_type] !== "REG") continue;
    let home: string, away: string;
    try {
      home = teamFromAbbr(row[idx.home_team]).abbr;
      away = teamFromAbbr(row[idx.away_team]).abbr;
    } catch { continue; }
    games.push({
      season: s,
      week: num(row[idx.week]) ?? 0,
      type: "REG",
      date: row[idx.gameday],
      home,
      away,
      homeScore: num(row[idx.home_score]),
      awayScore: num(row[idx.away_score]),
    });
  }
  gamesMemo = { at: Date.now(), games };
  return season === undefined ? games : games.filter((g) => g.season === season);
}

/** Never let a chart take the page down with it. */
export async function tryFetchGames(season?: number): Promise<Game[] | null> {
  try {
    return await fetchGames(season && season > 0 ? season : undefined);
  } catch {
    return null;
  }
}
