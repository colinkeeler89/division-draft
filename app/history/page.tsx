import Link from "next/link";
import RaceChart, { type Series } from "@/components/RaceChart";
import { managerColor } from "@/lib/colors";
import PlacementGrid from "@/components/PlacementGrid";
import FeedDown from "@/components/FeedDown";
import { buildCareer, fmt, frozenStreak, loadAllSeasons, recordString, MANAGERS } from "@/lib/pool";

export const revalidate = 900;

export default async function History() {
  const { seasons: all, feedOk } = await loadAllSeasons();
  const seasons = all.filter((s) => s.drafted && s.started);
  const career = buildCareer(seasons);
  const chrono = [...seasons].sort((a, b) => a.season - b.season);
  const completed = chrono.filter((s) => s.complete);

  const pointsByYear: Series[] = MANAGERS.map((m) => ({
    manager: m,
    color: managerColor(m),
    values: chrono.map((s) => s.table.find((r) => r.manager === m)?.points ?? null),
  }));

  const titleHolder = career[0];
  const frozen = frozenStreak(seasons);

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">All-time · {completed.length} completed seasons</p>
        <h1>The long record</h1>
        <p className="sub">
          Every season recomputed from actual NFL results rather than from what anyone typed into a
          spreadsheet at the time. {titleHolder.manager} leads on {fmt(titleHolder.titles)} titles
          {frozen.length > 1 && <> — and the last {frozen.length} seasons have finished in the identical order</>}.
        </p>
      </div>

      <div className="tiles">
        {career.map((c) => (
          <div className="tile" key={c.manager}>
            <div className="tile-label">
              <span className="chip">
                <i className="dot" style={{ background: managerColor(c.manager), height: 10 }} />
                {c.manager}
              </span>
            </div>
            <div className="tile-value">
              {fmt(c.titles)} <small>{c.titles === 1 ? "title" : "titles"}</small>
            </div>
            <div className="tile-foot">
              {fmt(c.avgPoints)} pts/season · {recordString(c.record)}
            </div>
          </div>
        ))}
      </div>

      <PlacementGrid seasons={completed} career={career} frozen={frozen} />

      <div className="card">
        <div className="card-head">
          <h2>Points by season</h2>
          <span className="card-note">regular-season wins, ties at a half</span>
        </div>
        <div className="card-body">
          <RaceChart
            labels={chrono.map((s) => String(s.season))}
            series={pointsByYear}
            yLabel="Points"
            xLabel="Season"
          />
        </div>
        <div className="legend">
          {pointsByYear.map((x) => (
            <span className="chip" key={x.manager}>
              <i className="dot" style={{ background: x.color }} />
              {x.manager}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Career table</h2>
          <span className="card-note">{completed.length} seasons</span>
        </div>
        <div className="card-body flush">
          <div className="tablescroll">
            <table>
              <thead>
                <tr>
                  <th>Manager</th>
                  <th>Titles</th>
                  <th>1st</th>
                  <th>2nd</th>
                  <th>3rd</th>
                  <th>4th</th>
                  <th>Total pts</th>
                  <th>Avg</th>
                  <th>Best</th>
                  <th>Worst</th>
                </tr>
              </thead>
              <tbody>
                {career.map((c) => (
                  <tr key={c.manager}>
                    <td>
                      <span className="mgr">
                        <i className="swatch" style={{ background: managerColor(c.manager) }} />
                        {c.manager}
                      </span>
                    </td>
                    <td className="num big">{fmt(c.titles)}</td>
                    <td className="num">{c.finishes[0]}</td>
                    <td className="num muted">{c.finishes[1]}</td>
                    <td className="num muted">{c.finishes[2]}</td>
                    <td className="num muted">{c.finishes[3]}</td>
                    <td className="num">{fmt(c.points)}</td>
                    <td className="num">{c.avgPoints.toFixed(1)}</td>
                    <td className="num muted">{c.best ? `${fmt(c.best.points)} (${c.best.season})` : "—"}</td>
                    <td className="num muted">{c.worst ? `${fmt(c.worst.points)} (${c.worst.season})` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Season by season</h2>
          <span className="card-note">finishing order, points in brackets</span>
        </div>
        <div className="card-body flush">
          <div className="tablescroll">
            <table>
              <thead>
                <tr>
                  <th>Season</th>
                  <th style={{ textAlign: "left" }}>1st</th>
                  <th style={{ textAlign: "left" }}>2nd</th>
                  <th style={{ textAlign: "left" }}>3rd</th>
                  <th style={{ textAlign: "left" }}>4th</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {[...seasons]
                  .sort((a, b) => b.season - a.season)
                  .map((s) => {
                    const ordered = [...s.table].sort((a, b) => b.points - a.points);
                    const margin = ordered[0].points - ordered[1].points;
                    return (
                      <tr key={s.season}>
                        <td>
                          <Link href={`/season/${s.season}`} style={{ fontWeight: 620 }}>
                            {s.season}
                          </Link>{" "}
                          {!s.complete && <span className="pill live" style={{ marginLeft: 6 }}>live</span>}
                        </td>
                        {ordered.map((m, i) => (
                          <td key={m.manager} style={{ textAlign: "left" }}>
                            <span className="chip">
                              <i className="dot" style={{ background: managerColor(m.manager) }} />
                              <span style={{ fontWeight: i === 0 ? 650 : 450 }}>
                                {m.manager}{" "}
                                <span className="muted num" style={{ fontSize: 12 }}>{fmt(m.points)}</span>
                              </span>
                            </span>
                          </td>
                        ))}
                        <td className="num muted">{margin ? fmt(margin) : "tie"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
