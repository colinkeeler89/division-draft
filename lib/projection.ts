import type { Game, StandingsTable } from "./nfl";
import {
  MANAGERS,
  points as ptsOf,
  type Manager,
  type Record3,
  type SeasonView,
} from "./pool";

/**
 * Live projection of where the pool finishes.
 *
 * No third-party projection feed is used. Free ones either need a paid key,
 * block server IPs, or have been discontinued — and a projection feed that dies
 * in November is worse than none. Everything here is computed from the schedule
 * and results the site already fetches, so it cannot break separately.
 *
 * The model, in three parts:
 *
 *  1. A team's strength is its win probability against an average opponent on a
 *     neutral field, held as a Beta posterior. The prior is last season's win
 *     rate pulled 65% back toward .500 (fitted: last season explains far less
 *     than people assume) and carries the weight of PRIOR_GAMES games. Results
 *     this season are added as they land, so the prior fades on its own.
 *  2. A single game is resolved with the log5 formula plus a home-field term.
 *  3. The rest of the schedule is simulated many times. Each simulation draws
 *     each team's strength from its posterior rather than using the mean, so
 *     the spread reflects "we don't know how good these teams are" and not just
 *     "coins are coins". Without that the projection is visibly overconfident.
 *
 * Constants fitted by maximum likelihood over 2015–2025 (4,175 games):
 * game-level log-loss 0.621 against 0.693 for a coin flip. Pooled over 396
 * manager-week predictions the win probabilities score a Brier of 0.124 against
 * 0.1875 for always guessing 25% — a 34% reduction in error.
 */

/** Home teams win 55.4% of the time; this is that edge in log-odds. */
const HOME_FIELD = 0.2174;
/** How much of last season's win rate carries over. Fitted; deliberately low. */
const PRIOR_SHRINK = 0.35;
/** Weight of the prior, in games. Fitted. */
const PRIOR_GAMES = 10;
/** NFL ties, 2010–2025. */
const TIE_RATE = 0.00311;

const SIMS = 4000;
/** A tie is half a win, same as the pool. */
const TIE_VALUE_HALF = 0.5;

/* ---------------------------------------------------------------- */
/* Deterministic RNG — the same week must project the same numbers,  */
/* or the page would jitter on every rebuild.                        */
/* ---------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Marsaglia–Tsang gamma sampler, used to build Beta draws. */
function gamma(rand: () => number, shape: number): number {
  if (shape < 1) return gamma(rand, shape + 1) * Math.pow(rand(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      // Box–Muller for a standard normal
      const u1 = Math.max(rand(), 1e-12);
      const u2 = rand();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

const beta = (rand: () => number, a: number, b: number) => {
  const x = gamma(rand, a);
  return x / (x + gamma(rand, b));
};

/* ---------------------------------------------------------------- */

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** log5 with home-field: probability the AWAY team wins. */
function awayWinProb(pAway: number, pHome: number): number {
  const a = clamp(pAway, 0.02, 0.98);
  const h = clamp(pHome, 0.02, 0.98);
  const num = a * (1 - h);
  const den = num + h * (1 - a);
  const neutral = den > 0 ? num / den : 0.5;
  const logit = Math.log(neutral / (1 - neutral)) - HOME_FIELD;
  return clamp(1 / (1 + Math.exp(-logit)), 0.01, 0.99);
}

export type ManagerProjection = {
  manager: Manager;
  current: number;
  /** mean simulated final points */
  projected: number;
  /** 10th and 90th percentile of simulated final points */
  low: number;
  high: number;
  winProb: number;
  /** probability of finishing 1st, 2nd, 3rd, 4th */
  finishProb: [number, number, number, number];
};

export type Projection = {
  season: number;
  week: number;
  gamesLeft: number;
  rows: ManagerProjection[];
  sims: number;
};

export function project(
  view: SeasonView,
  games: Game[],
  standings: StandingsTable,
): Projection | null {
  if (!view.drafted) return null;

  const priorRecs = standings.get(view.season - 1);
  const thisRecs = standings.get(view.season);

  // team -> manager
  const owner = new Map<string, Manager>();
  for (const row of view.table) {
    for (const slot of row.slots) if (slot.team) owner.set(slot.team.abbr, row.manager);
  }
  if (!owner.size) return null;

  // Beta posterior per team
  const post = new Map<string, [number, number]>();
  for (const abbr of owner.keys()) {
    const prior = priorRecs?.get(abbr);
    const priorRate =
      prior && prior.w + prior.l + prior.t > 0
        ? ptsOf(prior) / (prior.w + prior.l + prior.t)
        : 0.5;
    const q0 = 0.5 + PRIOR_SHRINK * (priorRate - 0.5);
    const cur: Record3 = thisRecs?.get(abbr) ?? { w: 0, l: 0, t: 0 };
    const played = cur.w + cur.l + cur.t;
    post.set(abbr, [
      PRIOR_GAMES * q0 + ptsOf(cur),
      PRIOR_GAMES * (1 - q0) + played - ptsOf(cur),
    ]);
  }

  const remaining = games.filter(
    (g) =>
      g.season === view.season &&
      g.homeScore === null &&
      owner.has(g.home) &&
      owner.has(g.away),
  );

  /**
   * Current points are counted from the game feed, NOT from the standings table.
   * The two nflverse files update independently: a Wednesday night result can sit
   * in games.csv for hours before standings.csv reflects it. Taking `remaining`
   * from one and `base` from the other silently drops that game from the
   * simulation. Counting both here keeps base + remaining equal to the full
   * schedule no matter which feed is ahead.
   */
  const base = Object.fromEntries(MANAGERS.map((m) => [m, 0])) as Record<Manager, number>;
  for (const g of games) {
    if (g.season !== view.season) continue;
    if (g.homeScore === null || g.awayScore === null) continue;
    const away = owner.get(g.away);
    const home = owner.get(g.home);
    if (!away || !home) continue;
    if (g.homeScore > g.awayScore) base[home] += 1;
    else if (g.awayScore > g.homeScore) base[away] += 1;
    else { base[home] += TIE_VALUE_HALF; base[away] += TIE_VALUE_HALF; }
  }

  // Season already over: nothing to simulate.
  if (!remaining.length) {
    const sorted = [...view.table].sort((a, b) => b.points - a.points);
    return {
      season: view.season,
      week: view.currentWeek,
      gamesLeft: 0,
      sims: 0,
      rows: view.table.map((r) => {
        const place = sorted.findIndex((x) => x.points === r.points);
        const fp: [number, number, number, number] = [0, 0, 0, 0];
        fp[Math.min(place, 3)] = 1;
        return {
          manager: r.manager,
          current: r.points,
          projected: r.points,
          low: r.points,
          high: r.points,
          winProb: place === 0 ? 1 : 0,
          finishProb: fp,
        };
      }),
    };
  }

  const rand = mulberry32(view.season * 1000 + remaining.length);
  const totals = Object.fromEntries(MANAGERS.map((m) => [m, [] as number[]])) as Record<Manager, number[]>;
  const finishes = Object.fromEntries(
    MANAGERS.map((m) => [m, [0, 0, 0, 0] as [number, number, number, number]]),
  ) as Record<Manager, [number, number, number, number]>;

  for (let s = 0; s < SIMS; s++) {
    const strength = new Map<string, number>();
    for (const [abbr, [a, b]] of post) strength.set(abbr, beta(rand, a, b));

    const pts = { ...base };
    for (const g of remaining) {
      const away = owner.get(g.away)!;
      const home = owner.get(g.home)!;
      if (rand() < TIE_RATE) {
        pts[away] += 0.5;
        pts[home] += 0.5;
      } else if (rand() < awayWinProb(strength.get(g.away)!, strength.get(g.home)!)) {
        pts[away] += 1;
      } else {
        pts[home] += 1;
      }
    }

    for (const m of MANAGERS) totals[m].push(pts[m]);
    const order = [...MANAGERS].sort((a, b) => pts[b] - pts[a]);
    // shared places split credit, matching how the pool ranks
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j + 1 < order.length && pts[order[j + 1]] === pts[order[i]]) j++;
      // A group of g tied managers splits places i..j evenly: each takes 1/g of
      // each place, so each manager still accumulates exactly one finish.
      const share = 1 / (j - i + 1);
      for (let k = i; k <= j; k++) {
        for (let place = i; place <= j; place++) finishes[order[k]][place] += share;
      }
      i = j + 1;
    }
  }

  const pct = (arr: number[], p: number) => {
    const a = [...arr].sort((x, y) => x - y);
    return a[Math.min(a.length - 1, Math.floor(p * a.length))];
  };

  const rows: ManagerProjection[] = MANAGERS.map((m) => {
    const t = totals[m];
    const f = finishes[m].map((v) => v / SIMS) as [number, number, number, number];
    return {
      manager: m,
      current: base[m],
      projected: t.reduce((a, b) => a + b, 0) / t.length,
      low: pct(t, 0.1),
      high: pct(t, 0.9),
      winProb: f[0],
      finishProb: f,
    };
  }).sort((a, b) => b.winProb - a.winProb || b.projected - a.projected);

  return {
    season: view.season,
    week: view.currentWeek,
    gamesLeft: remaining.length,
    rows,
    sims: SIMS,
  };
}
