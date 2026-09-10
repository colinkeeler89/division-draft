import { NextResponse } from "next/server";
import { LATEST_SEASON, loadSeason } from "@/lib/pool";

export const revalidate = 300;

/** Quick check that the upstream feed is alive and the pool still computes. */
export async function GET() {
  try {
    const { view: s, feedOk } = await loadSeason(LATEST_SEASON, false);
    return NextResponse.json({
      ok: feedOk,
      source: "nflverse/nfldata standings.csv",
      season: s.season,
      drafted: s.drafted,
      started: s.started,
      complete: s.complete,
      played: `${s.gamesPlayed}/${s.gamesTotal}`,
      problems: s.problems,
      standings: s.table.map((m) => ({ manager: m.manager, rank: m.rank, points: m.points, record: m.record })),
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
