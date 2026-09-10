import {
  MANAGERS,
  points,
  type Manager,
  type Record3,
  type SeasonView,
} from "./pool";
import { DIVISIONS, type Division } from "./teams";

/* ------------------------------------------------------------------ */
/* Division heatmap                                                    */
/* ------------------------------------------------------------------ */

export type DivisionHeat = {
  cell: Record<Manager, Record<Division, number>>;
  /** how often a manager's pick was the best of the four in its division */
  bestInDivision: Record<Manager, number>;
  min: number;
  max: number;
  best: { manager: Manager; division: Division; value: number };
  worst: { manager: Manager; division: Division; value: number };
};

export function divisionHeat(seasons: SeasonView[]): DivisionHeat | null {
  const usable = seasons.filter((s) => s.drafted && s.started);
  if (!usable.length) return null;

  const sums = new Map<string, { total: number; n: number }>();
  const bestInDivision = Object.fromEntries(MANAGERS.map((m) => [m, 0])) as Record<Manager, number>;

  for (const s of usable) {
    for (const div of DIVISIONS) {
      const inDiv = s.table
        .map((row) => ({ manager: row.manager, slot: row.slots.find((x) => x.division === div) }))
        .filter((x) => x.slot?.team);
      if (!inDiv.length) continue;

      const vals = inDiv.map((x) => points(x.slot!.record));
      const top = Math.max(...vals);
      const winners = vals.filter((v) => v === top).length;

      inDiv.forEach((x, i) => {
        const key = `${x.manager}|${div}`;
        const cur = sums.get(key) ?? { total: 0, n: 0 };
        cur.total += vals[i];
        cur.n += 1;
        sums.set(key, cur);
        if (vals[i] === top) bestInDivision[x.manager] += 1 / winners;
      });
    }
  }

  const cell = Object.fromEntries(
    MANAGERS.map((m) => [
      m,
      Object.fromEntries(
        DIVISIONS.map((d) => {
          const c = sums.get(`${m}|${d}`);
          return [d, c && c.n ? c.total / c.n : 0];
        }),
      ),
    ]),
  ) as DivisionHeat["cell"];

  type Cell = { manager: Manager; division: Division; value: number };
  let best: Cell = { manager: MANAGERS[0], division: DIVISIONS[0], value: -Infinity };
  let worst: Cell = { manager: MANAGERS[0], division: DIVISIONS[0], value: Infinity };
  for (const m of MANAGERS) {
    for (const d of DIVISIONS) {
      const v = cell[m][d];
      if (v > best.value) best = { manager: m, division: d, value: v };
      if (v < worst.value) worst = { manager: m, division: d, value: v };
    }
  }

  return { cell, bestInDivision, min: worst.value, max: best.value, best, worst };
}

/* ------------------------------------------------------------------ */
/* Head-to-head                                                        */
/* ------------------------------------------------------------------ */

export type HeadToHead = Record<Manager, Record<Manager, number>>;

export function headToHead(seasons: SeasonView[]): HeadToHead {
  const h2h = Object.fromEntries(
    MANAGERS.map((a) => [a, Object.fromEntries(MANAGERS.map((b) => [b, 0]))]),
  ) as HeadToHead;
  for (const s of seasons) {
    if (!s.drafted || !s.complete) continue;
    for (const a of s.table) {
      for (const b of s.table) {
        if (a.manager !== b.manager && a.points > b.points) h2h[a.manager][b.manager] += 1;
      }
    }
  }
  return h2h;
}

/* ------------------------------------------------------------------ */
/* Extremes                                                            */
/* ------------------------------------------------------------------ */

export type Pick = {
  season: number;
  manager: Manager;
  team: string;
  color: string;
  record: Record3;
  points: number;
};

export function extremes(seasons: SeasonView[], count = 5): { best: Pick[]; worst: Pick[]; total: number } {
  const all: Pick[] = [];
  for (const s of seasons) {
    if (!s.drafted || !s.started) continue;
    for (const row of s.table) {
      for (const slot of row.slots) {
        if (!slot.team) continue;
        all.push({
          season: s.season,
          manager: row.manager,
          team: slot.team.nick,
          color: slot.team.color,
          record: slot.record,
          points: points(slot.record),
        });
      }
    }
  }
  // Ties broken by losses, so 15-1 outranks 15-2 and 0-16 is worse than 1-15.
  const best = [...all].sort((a, b) => b.points - a.points || a.record.l - b.record.l).slice(0, count);
  const worst = [...all].sort((a, b) => a.points - b.points || b.record.l - a.record.l).slice(0, count);
  return { best, worst, total: all.length };
}
