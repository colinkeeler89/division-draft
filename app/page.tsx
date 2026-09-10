import Link from "next/link";
import {
  Problems,
  RaceCard,
  RosterCard,
  StandingsTable,
  StatTiles,
} from "@/components/SeasonView";
import ProjectionCard from "@/components/ProjectionCard";
import FeedDown from "@/components/FeedDown";
import { REVALIDATE_SECONDS } from "@/lib/nfl";
import { LATEST_SEASON, SEASONS, fetchPair, fmt } from "@/lib/load";

export const revalidate = 900;

export default async function Home() {
  const { season, prior, projection, feedOk } = await fetchPair();
  const defending = prior.complete ? prior.table.find((m) => m.rank === 1) : undefined;

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">
          {LATEST_SEASON} Season{" "}
          {season.complete ? (
            <span className="pill final">Final</span>
          ) : season.started ? (
            <span className="pill live">Week {season.currentWeek || "1"}</span>
          ) : (
            <span className="pill">Kickoff pending</span>
          )}
        </p>
        <h1>The {LATEST_SEASON} race</h1>
        <p className="sub">
          Four managers, one team from every division, most combined wins takes it.
          {defending && (
            <>
              {" "}
              <strong>{defending.manager}</strong> is defending {prior.season}, when he finished on{" "}
              {fmt(defending.points)} points.
            </>
          )}
        </p>
      </div>

      {!feedOk && <FeedDown />}
      <Problems s={season} />

      {!season.drafted ? (
        <div className="notice">
          <h3>The {LATEST_SEASON} draft isn&apos;t entered yet</h3>
          <p>
            Open <code>data/rosters.json</code>, fill in the <code>&quot;{LATEST_SEASON}&quot;</code> block with each
            manager&apos;s eight picks, and push to GitHub. Standings, the weekly race and every team&apos;s record
            fill themselves in from there — it is the only thing anyone has to type all year.
          </p>
        </div>
      ) : !season.started ? (
        <>
          <div className="notice">
            <h3>Rosters are locked, no games played yet</h3>
            <p>Standings turn on by themselves the moment Week 1 results land.</p>
          </div>
          {projection && <ProjectionCard p={projection} />}
          <RosterCard s={season} />
        </>
      ) : (
        <>
          <StatTiles s={season} />
          <RaceCard s={season} />
          <StandingsTable s={season} />
          {projection && <ProjectionCard p={projection} />}
          <RosterCard s={season} />
        </>
      )}

      <div className="card">
        <div className="card-head">
          <h2>Every season</h2>
          <span className="card-note">{SEASONS.length - 1} in the books</span>
        </div>
        <div className="card-body">
          <div className="yearnav">
            {SEASONS.filter((y) => y !== LATEST_SEASON).map((y) => (
              <Link key={y} href={`/season/${y}`}>{y}</Link>
            ))}
          </div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12.5 }}>
        Rebuilds at most once every {REVALIDATE_SECONDS / 60} minutes.{" "}
        <Link href="/history" style={{ textDecoration: "underline" }}>All-time table →</Link>
      </p>
    </>
  );
}
