# Division Draft

The NFL division-draft wins pool, as a website instead of a spreadsheet.

Four managers, one team from every division, most combined wins at the end of the
regular season takes it. Ties count half a win.

**Nobody enters a score, ever.** The site pulls real NFL results and computes
standings, weekly race, per-team records and eleven seasons of history on its own.
The only thing a human types is the draft — eight picks per manager, once a year.

---

## The one file you edit: `data/rosters.json`

```json
{
  "2026": {
    "Tom":   { "AFC East": "Bills", "AFC North": "Ravens", ... },
    "Jeff":  { ... },
    "Colin": { ... },
    "Joey":  { ... }
  },
  "2025": { ... }
}
```

Every manager needs all eight divisions: `AFC East`, `AFC North`, `AFC South`,
`AFC West`, `NFC East`, `NFC North`, `NFC South`, `NFC West`.

Team names are forgiving — `Bills`, `bills`, `Buffalo Bills` and `BUF` all work, and
so do the old spreadsheet's shorthands (`Bucs`, `Jags`, `Redskins`). If you type
something it can't match, or put a team under the wrong division, the site says so
in a yellow box at the top of the page instead of silently scoring it as zero.

To start a new season: copy the previous year's block, change the year, replace the
picks. Commit. Done.

---

## Deploying to Vercel

You need a [GitHub](https://github.com) account and a [Vercel](https://vercel.com)
account. Both are free, and this project fits comfortably inside Vercel's free tier.

**1. Put the code on GitHub.**

Create a new empty repository on GitHub (call it whatever you like — don't add a
README or .gitignore, this project has them). Then, in this folder:

```bash
git init
git add .
git commit -m "Division Draft"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

**2. Point Vercel at it.**

- Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
- Pick the repository you just pushed.
- Change nothing. Vercel detects Next.js and fills in every setting itself.
- Click **Deploy**, wait about a minute.

You get a URL like `your-repo.vercel.app`. Send it to the group.

**3. From then on.**

Editing `data/rosters.json` on GitHub — you can do it in the browser, click the
pencil icon — and committing is enough. Vercel rebuilds and redeploys by itself
within a minute.

### A note on who can see it

A Vercel deployment is public to anyone with the link. There's no login and no
personal information on it, so that's usually fine for a friends' pool. If you'd
rather lock it down, Vercel's **Deployment Protection** settings can require a
Vercel login or a shared password — that feature is on paid plans.

---

## How the data gets in

Results come from [nflverse](https://github.com/nflverse/nfldata), the open dataset
the NFL analytics community runs on. It's free, needs no API key, has no rate limit,
and updates automatically through the season.

Two files, deliberately separated:

| File | Size | Used for | If it fails |
|---|---|---|---|
| `standings.csv` | ~56 KB | **every number on the site** | page shows an error |
| `games.csv` | ~2.9 MB | the week-by-week race line only | chart is skipped, numbers still exact |

Pages rebuild at most once every 15 minutes (`REVALIDATE_SECONDS` in `lib/nfl.ts`),
so results appear within a quarter hour of a game going final and Vercel never gets
hammered.

To swap data providers later, `lib/nfl.ts` is the only file that changes — everything
downstream consumes the same shape.

### Health check

`https://your-site.vercel.app/api/health` returns JSON with the upstream status,
current standings, and any roster problems. Handy when something looks wrong.

---

## Running it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Node 20.9 or newer (pinned in `package.json` under `engines`).

### If a deploy fails

Vercel's log ends with `Command "npm run build" exited with 1`, which says nothing on its own —
the real error is 10–30 lines above it. Lines beginning `npm warn` are noise and never the cause.

Two things this project already guards against:

- **The results feed being unreachable at build time.** Every page prerenders, so a throw during
  fetching used to take the whole deploy down. Pages now render a "couldn't reach the results
  feed" notice instead and repair themselves at the next revalidation. You can prove it by
  pointing the URLs in `lib/nfl.ts` at a bad host and running `npm run build` — it still succeeds.
- **A stale Next.js release.** `next` is pinned; if npm reports a deprecation with a CVE link,
  bump the patch version in `package.json`, delete `package-lock.json`, and run `npm install`.

---

## The live projection

The home page carries a projected finish: each manager's chance of winning the pool and
where their final points are likely to land. It is simulated, not scraped.

**Why not a projection feed?** Every free one is a liability: ESPN's FPI blocks server IPs,
odds APIs want a paid key, and FiveThirtyEight's Elo is gone. A projection feed that dies in
November is worse than no projection. This runs on the schedule and results the site already
fetches, so it has nothing extra to break.

**The model** (`lib/projection.ts`):

1. Each team's strength is a Beta posterior over "win probability against an average opponent
   on a neutral field". The prior is last season's win rate pulled 65% back toward .500 and
   weighted as 10 games; this season's results are added as they land, so the prior fades out
   by about week 10 on its own.
2. Games resolve by log5 plus a home-field term.
3. The rest of the schedule is simulated 4,000 times. Every simulation redraws each team's
   strength from its posterior rather than reusing the mean — without that the projection is
   visibly overconfident, because it would be modelling coin flips but not the fact that we
   don't know how good these teams are.

**Fitted, not guessed.** Home-field (+0.2174 logits, a 55.4% home win rate), prior shrinkage
(0.35) and prior weight (10 games) were fitted by maximum likelihood over 2015–2025. Game-level
log-loss is 0.621 against 0.693 for a coin flip.

**Backtested.** Replaying all eleven seasons, the projected favourite won the pool 3/11 at week
zero, ~6/11 by week 8, and 11/11 by week 16 — so preseason numbers deserve very little weight
and the card says so. Pooled over 396 manager-week predictions the win probabilities score a
Brier of 0.124 against 0.1875 for always guessing 25%, a 34% reduction in error, and the
calibration bins line up (predicted 18% → happened 18%; predicted 50% → happened 50%).

**One trap worth knowing.** `standings.csv` and `games.csv` update independently, so a result
can sit in one for hours before the other catches up. The simulation therefore counts current
points from the *game* feed, the same source as the remaining fixtures — otherwise a game
falls between the two files and vanishes. Projected points always sum to the number of games
in a season; that is the invariant to check if you ever change this file.

## Analytics

`/analytics` covers what the standings table can't show.

- **Who owns which division** — average points per pick, per manager, per division.
- **Head to head** — seasons each manager finished above each other.
- **The extremes** — the best and worst single picks ever made.

Everything recomputes from live results; nothing is hard-coded.

## Layout

```
app/
  page.tsx              current season
  season/[year]/        one page per season, 2015 onward
  history/              all-time table, titles, points by season, placement grid
  analytics/            division heatmap, head to head, extremes
  api/health/           upstream status as JSON
components/
  RaceChart.tsx         the line chart (hand-rolled SVG, no chart library)
  SeasonView.tsx        tiles, standings table, roster grid
lib/
  nfl.ts                fetching and parsing — the only file that knows about nflverse
  pool.ts               scoring, ranking, career totals
  analytics.ts          division heatmap, head-to-head, extremes
  projection.ts         the simulation behind the projected finish
  teams.ts              the 32 franchises, incl. old abbreviations (OAK, SD, STL)
data/
  rosters.json          THE ONLY FILE YOU EDIT
```

No database, no cron job, no admin login, no environment variables. Nothing to
maintain in the off-season.

---

## Notes on the history

The eleven seasons here were recovered from the original spreadsheet's draft grids
and then **re-scored from actual NFL results**, so the numbers are the ones the games
produced rather than the ones typed in at the time.

The old sheet was in better shape than it looked: 352 team-season records, 350 exactly
right. The two exceptions were Buffalo and Cincinnati in 2022, both recorded as
`13-3-1` / `12-4-1`. That game — Week 17, 2022 — was cancelled rather than tied, so
the NFL counts it as no contest and both teams played 16 games. Recording it as a tie
handed Tom and Colin half a phantom point each. Neither changed a placing.

Franchises are shown under their current names throughout, so 2015's Washington
appears as the Commanders and 2015's St. Louis Rams as the Rams.

## Colour

The four manager colours are validated categorical slots — checked for
colourblind separation and contrast in both light and dark, and every line is also
labelled at its end, so nobody has to tell blue from orange to read the chart.
Each manager keeps their colour whether they're winning or losing.
