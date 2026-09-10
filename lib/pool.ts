import rostersJson from "@/data/rosters.json";
import {
  fetchStandingsSafe,
  tryFetchGames,
  type Game,
  type Record3,
  type StandingsTable,
} from "./nfl";
import { DIVISIONS, teamFromNick, type Division, type Team } from "./teams";

export type { Record3 };

/* ------------------------------------------------------------------ */
/* Pool configuration                                                  */
/* ------------------------------------------------------------------ */

/** Display order for the four managers. Also fixes their chart colour slot. */
export const MANAGERS = ["Tom", "Jeff", "Colin", "Joey"] as const;
export type Manager = (typeof MANAGERS)[number];

/** A tie is worth half a win. That is the whole scoring system. */
export const TIE_VALUE = 0.5;

/** The NFL went from a 16- to a 17-game regular season in 2021. */
export const gamesPerTeam = (season: number) => (season >= 2021 ? 17 : 16);

/**
 * A season is finished if every scheduled game is in, OR if the calendar has
 * simply moved past it. The second clause matters: the 2022 Bills–Bengals game
 * was cancelled and never made up, so that season's game count is one short of
 * its schedule forever.
 */
function seasonIsOver(season: number, now = new Date()): boolean {
  return now.getTime() >= Date.UTC(season + 1, 1, 1); // 1 Feb of the following year
}

type RosterFile = Record<string, Record<string, Record<string, string | null>>>;
const ROSTERS = rostersJson as RosterFile;

export const SEASONS: number[] = Object.keys(ROSTERS).map(Number).sort((a, b) => b - a);
export const LATEST_SEASON = Math.max(...SEASONS);
export const FIRST_SEASON = Math.min(...SEASONS);

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export const emptyRecord = (): Record3 => ({ w: 0, l: 0, t: 0 });
export const points = (r: Record3) => r.w + r.t * TIE_VALUE;
export const played = (r: Record3) => r.w + r.l + r.t;

export type RosterSlot = {
  division: Division;
  team: Team | null;
  raw: string | null;
  record: Record3;
};

export type ManagerSeason = {
  manager: Manager;
  slots: RosterSlot[];
  record: Record3;
  points: number;
  gamesPlayed: number;
  gamesLeft: number;
  rank: number;
  behind: number;
};

export type WeekPoint = { week: number; totals: Record<Manager, number> };

export type SeasonView = {
  season: number;
  drafted: boolean;
  started: boolean;
  complete: boolean;
  table: ManagerSeason[];
  weekly: WeekPoint[];
  currentWeek: number;
  gamesPlayed: number;
  gamesTotal: number;
  lastGameDate: string | null;
  problems: string[];
};

export type CareerRow = {
  manager: Manager;
  titles: number;
  seasons: number;
  points: number;
  record: Record3;
  avgPoints: number;
  best: { season: number; points: number } | null;
  worst: { season: number; points: number } | null;
  finishes: [number, number, number, number];
};

/* ------------------------------------------------------------------ */
/* Season                                                              */
/* ------------------------------------------------------------------ */

export function buildSeason(standings: StandingsTable, season: number): SeasonView {
  const roster = ROSTERS[String(season)] ?? {};
  const recs = standings.get(season) ?? new Map<string, Record3>();
  const problems: string[] = [];

  const table: ManagerSeason[] = MANAGERS.map((manager) => {
    const picks = roster[manager] ?? {};
    const slots: RosterSlot[] = DIVISIONS.map((division) => {
      const raw = picks[division] ?? null;
      const team = raw ? teamFromNick(raw) : null;
      if (raw && !team) {
        problems.push(`${manager} · ${division}: "${raw}" is not a team I recognise`);
      } else if (team && team.div !== division) {
        problems.push(`${manager}: ${team.nick} play in ${team.div}, but are listed under ${division}`);
      }
      return {
        division,
        team,
        raw,
        record: team ? (recs.get(team.abbr) ?? emptyRecord()) : emptyRecord(),
      };
    });

    const record = slots.reduce<Record3>(
      (a, s) => ({ w: a.w + s.record.w, l: a.l + s.record.l, t: a.t + s.record.t }),
      emptyRecord(),
    );
    const gamesPlayed = played(record);
    const teamCount = slots.filter((s) => s.team).length;
    const scheduled = teamCount * gamesPerTeam(season);

    return {
      manager,
      slots,
      record,
      points: points(record),
      gamesPlayed,
      gamesLeft: Math.max(0, scheduled - gamesPlayed),
      rank: 0,
      behind: 0,
    };
  });

  const drafted = table.some((m) => m.slots.some((s) => s.team));
  const gamesPlayed = table.reduce((a, m) => a + m.gamesPlayed, 0) / 2;
  const gamesTotal = drafted ? (MANAGERS.length * 8 * gamesPerTeam(season)) / 2 : 0;

  rank(table);

  return {
    season,
    drafted,
    started: gamesPlayed > 0,
    complete: gamesTotal > 0 && (gamesPlayed >= gamesTotal || seasonIsOver(season)),
    table,
    weekly: [],
    currentWeek: 0,
    gamesPlayed,
    gamesTotal,
    lastGameDate: null,
    problems,
  };
}

function rank(table: ManagerSeason[]) {
  table.sort((a, b) => b.points - a.points || b.record.w - a.record.w || a.manager.localeCompare(b.manager));
  const leader = table[0]?.points ?? 0;
  let r = 0;
  let prev: number | null = null;
  table.forEach((row, i) => {
    if (prev === null || row.points !== prev) r = i + 1;
    prev = row.points;
    row.rank = r;
    row.behind = Math.round((leader - row.points) * 10) / 10;
  });
}

/**
 * Enrich a season with its week-by-week cumulative totals. Optional by design:
 * if the game-level feed is unavailable the standings above are still exact.
 */
export function addWeekly(view: SeasonView, games: Game[]): SeasonView {
  const ownerOf = new Map<string, Manager>();
  for (const m of view.table) {
    for (const s of m.slots) if (s.team) ownerOf.set(s.team.abbr, m.manager);
  }

  const byWeek = new Map<number, Game[]>();
  for (const g of games) {
    if (g.season !== view.season) continue;
    const list = byWeek.get(g.week) ?? [];
    list.push(g);
    byWeek.set(g.week, list);
  }

  const running = Object.fromEntries(MANAGERS.map((m) => [m, 0])) as Record<Manager, number>;
  const weekly: WeekPoint[] = [];
  let currentWeek = 0;
  let lastGameDate: string | null = null;

  for (const wk of [...byWeek.keys()].sort((a, b) => a - b)) {
    let any = false;
    for (const g of byWeek.get(wk)!) {
      if (g.homeScore === null || g.awayScore === null) continue;
      any = true;
      if (!lastGameDate || g.date > lastGameDate) lastGameDate = g.date;
      const award = (abbr: string, v: number) => {
        const m = ownerOf.get(abbr);
        if (m) running[m] += v;
      };
      if (g.homeScore > g.awayScore) award(g.home, 1);
      else if (g.awayScore > g.homeScore) award(g.away, 1);
      else { award(g.home, TIE_VALUE); award(g.away, TIE_VALUE); }
    }
    if (any) {
      currentWeek = wk;
      weekly.push({ week: wk, totals: { ...running } });
    }
  }

  return { ...view, weekly, currentWeek, lastGameDate };
}

/* ------------------------------------------------------------------ */
/* Career                                                              */
/* ------------------------------------------------------------------ */

export function buildCareer(seasons: SeasonView[]): CareerRow[] {
  const rows = MANAGERS.map<CareerRow>((manager) => ({
    manager, titles: 0, seasons: 0, points: 0, record: emptyRecord(),
    avgPoints: 0, best: null, worst: null, finishes: [0, 0, 0, 0],
  }));
  const byName = new Map(rows.map((r) => [r.manager, r]));

  for (const s of seasons) {
    if (!s.drafted || !s.started) continue;
    const champs = s.table.filter((m) => m.rank === 1);
    for (const m of s.table) {
      const row = byName.get(m.manager)!;
      row.seasons += 1;
      row.points += m.points;
      row.record.w += m.record.w;
      row.record.l += m.record.l;
      row.record.t += m.record.t;
      if (s.complete) {
        if (m.rank === 1) row.titles += 1 / champs.length;
        row.finishes[Math.min(m.rank, 4) - 1] += 1;
        if (!row.best || m.points > row.best.points) row.best = { season: s.season, points: m.points };
        if (!row.worst || m.points < row.worst.points) row.worst = { season: s.season, points: m.points };
      }
    }
  }
  for (const r of rows) r.avgPoints = r.seasons ? r.points / r.seasons : 0;
  rows.sort((a, b) => b.titles - a.titles || b.points - a.points);
  return rows;
}

/* ------------------------------------------------------------------ */
/* Loaders                                                             */
/* ------------------------------------------------------------------ */

export async function loadSeason(
  season: number,
  withChart = true,
): Promise<{ view: SeasonView; feedOk: boolean }> {
  const { table: standings, ok: feedOk } = await fetchStandingsSafe();
  const view = buildSeason(standings, season);
  if (!withChart || !view.started) return { view, feedOk };
  const games = await tryFetchGames(season);
  return { view: games ? addWeekly(view, games) : view, feedOk };
}

export async function loadAllSeasons(): Promise<{ seasons: SeasonView[]; feedOk: boolean }> {
  const { table: standings, ok: feedOk } = await fetchStandingsSafe();
  return { seasons: SEASONS.map((s) => buildSeason(standings, s)), feedOk };
}

/**
 * How many of the most recent completed seasons finished in the identical order.
 * 1 means the last table moved; anything higher means it hasn't.
 */
export function frozenStreak(seasons: SeasonView[]): number[] {
  const done = seasons.filter((s) => s.complete).sort((a, b) => b.season - a.season);
  if (!done.length) return [];
  const key = (s: SeasonView) => s.table.map((m) => m.manager).join(">");
  const first = key(done[0]);
  const out = [done[0].season];
  for (let i = 1; i < done.length && key(done[i]) === first; i++) out.push(done[i].season);
  return out;
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
export const recordString = (r: Record3) => (r.t ? `${r.w}-${r.l}-${r.t}` : `${r.w}-${r.l}`);
