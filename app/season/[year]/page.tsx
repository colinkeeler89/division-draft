import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Problems,
  RaceCard,
  RosterCard,
  StandingsTable,
  StatTiles,
} from "@/components/SeasonView";
import { LATEST_SEASON, SEASONS, fmt, loadSeason, recordString } from "@/lib/pool";
import FeedDown from "@/components/FeedDown";

export const revalidate = 900;

export function generateStaticParams() {
  return SEASONS.map((y) => ({ year: String(y) }));
}

export default async function SeasonPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const y = Number(year);
  if (!SEASONS.includes(y)) notFound();

  const { view: season, feedOk } = await loadSeason(y);
  const champs = season.table.filter((m) => m.rank === 1);

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">
          Archive{" "}
          {season.complete ? <span className="pill final">Final</span> : <span className="pill live">In progress</span>}
        </p>
        <h1>{y}</h1>
        <p className="sub">
          {season.drafted && season.started ? (
            <>
              {champs.map((c) => c.manager).join(" and ")} {champs.length > 1 ? "shared it" : "took it"} on{" "}
              {fmt(champs[0].points)} points, {recordString(champs[0].record)} across eight teams.
            </>
          ) : season.drafted ? (
            <>Rosters are set. No games played yet.</>
          ) : (
            <>No draft recorded for this season.</>
          )}
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="yearnav">
            {SEASONS.map((s) => (
              <Link
                key={s}
                href={s === LATEST_SEASON ? "/" : `/season/${s}`}
                aria-current={s === y ? "page" : undefined}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {!feedOk && <FeedDown />}
      <Problems s={season} />

      {season.drafted && (
        <>
          {season.started && <StatTiles s={season} />}
          {season.started && <StandingsTable s={season} />}
          <RaceCard s={season} />
          <RosterCard s={season} />
        </>
      )}
    </>
  );
}
