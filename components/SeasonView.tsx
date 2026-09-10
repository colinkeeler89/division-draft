import { managerColor } from "@/lib/colors";
import {
  MANAGERS,
  fmt,
  recordString,
  type SeasonView as SeasonData,
} from "@/lib/pool";
import { DIVISIONS } from "@/lib/teams";
import RaceChart, { type Series } from "./RaceChart";

/* ---------------------------------------------------------------- */

export function StatTiles({ s }: { s: SeasonData }) {
  const leader = s.table[0];
  const cochamps = s.table.filter((m) => m.rank === 1);
  const margin = s.table.length > 1 ? leader.points - s.table.find((m) => m.rank > 1)!.points : 0;
  const pct = s.gamesTotal ? Math.round((s.gamesPlayed / s.gamesTotal) * 100) : 0;

  return (
    <div className="tiles">
      <div className="tile">
        <div className="tile-label">{s.complete ? "Champion" : "Leader"}</div>
        <div className="tile-value" style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <i
            className="swatch"
            style={{ background: managerColor(leader.manager), width: 12, height: 12 }}
            aria-hidden
          />
          {cochamps.map((c) => c.manager).join(" & ")}
        </div>
        <div className="tile-foot">
          {fmt(leader.points)} pts
          {margin > 0 && <> · +{fmt(margin)} clear</>}
          {margin === 0 && cochamps.length > 1 && <> · dead heat</>}
        </div>
      </div>

      <div className="tile">
        <div className="tile-label">Season</div>
        <div className="tile-value">
          {s.complete ? "Final" : `Wk ${s.currentWeek}`}
        </div>
        <div className="tile-foot">
          {s.gamesPlayed} of {s.gamesTotal} games · {pct}%
        </div>
      </div>

      <div className="tile">
        <div className="tile-label">Spread, 1st to 4th</div>
        <div className="tile-value">
          {fmt(leader.points - s.table[s.table.length - 1].points)} <small>pts</small>
        </div>
        <div className="tile-foot">
          {s.table[s.table.length - 1].manager} on {fmt(s.table[s.table.length - 1].points)}
        </div>
      </div>

      <div className="tile">
        <div className="tile-label">Last result</div>
        <div className="tile-value" style={{ fontSize: 20 }}>
          {s.lastGameDate
            ? new Date(`${s.lastGameDate}T12:00:00Z`).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })
            : "—"}
        </div>
        <div className="tile-foot">{s.complete ? "Regular season closed" : "Updates every 15 min"}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export function StandingsTable({ s }: { s: SeasonData }) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>Standings</h2>
        <span className="card-note">a tie counts half a win</span>
      </div>
      <div className="card-body flush">
        <div className="tablescroll">
          <table>
            <thead>
              <tr>
                <th>Manager</th>
                <th>W</th>
                <th>L</th>
                <th>T</th>
                <th>Pts</th>
                <th>Back</th>
                <th>Win %</th>
                {!s.complete && <th>Games left</th>}
              </tr>
            </thead>
            <tbody>
              {s.table.map((m) => {
                const gp = m.gamesPlayed;
                return (
                  <tr key={m.manager}>
                    <td>
                      <span className={`rank${m.rank === 1 ? " lead" : ""}`}>{m.rank}</span>
                      <span className="mgr">
                        <i className="swatch" style={{ background: managerColor(m.manager) }} />
                        {m.manager}
                      </span>
                    </td>
                    <td className="num">{m.record.w}</td>
                    <td className="num muted">{m.record.l}</td>
                    <td className="num muted">{m.record.t || "—"}</td>
                    <td className="num big">{fmt(m.points)}</td>
                    <td className="num muted">{m.behind ? `−${fmt(m.behind)}` : "—"}</td>
                    <td className="num">{gp ? (m.points / gp).toFixed(3).replace(/^0/, "") : "—"}</td>
                    {!s.complete && <td className="num muted">{m.gamesLeft || "—"}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export function RaceCard({ s }: { s: SeasonData }) {
  if (s.weekly.length < 2) return null;
  const series: Series[] = MANAGERS.map((name) => s.table.find((m) => m.manager === name)!)
    .map((m) => ({
      manager: m.manager,
      color: managerColor(m.manager),
      values: s.weekly.map((w) => w.totals[m.manager]),
    }));

  return (
    <div className="card">
      <div className="card-head">
        <h2>The race, week by week</h2>
        <span className="card-note">cumulative points</span>
      </div>
      <div className="card-body">
        <RaceChart
          labels={s.weekly.map((w) => `W${w.week}`)}
          series={series}
          yLabel="Cumulative points"
          xLabel="Regular-season week"
        />
      </div>
      <div className="legend">
        {series.map((x) => (
          <span className="chip" key={x.manager}>
            <i className="dot" style={{ background: x.color }} />
            {x.manager}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export function RosterCard({ s }: { s: SeasonData }) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>Rosters</h2>
        <span className="card-note">one team per division, per manager</span>
      </div>
      <div className="card-body flush">
        <div className="rostergrid">
          <table>
            <thead>
              <tr>
                <th>Division</th>
                {s.table
                  .slice()
                  .sort((a, b) => a.rank - b.rank)
                  .map((m) => (
                    <th key={m.manager}>
                      <span className="mgr" style={{ fontSize: 13 }}>
                        <i className="swatch" style={{ background: managerColor(m.manager) }} />
                        {m.manager}
                      </span>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {DIVISIONS.map((div) => (
                <tr key={div}>
                  <td className="divlabel">{div}</td>
                  {s.table
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .map((m) => {
                      const slot = m.slots.find((x) => x.division === div)!;
                      if (!slot.team) return <td key={m.manager} className="muted">—</td>;
                      return (
                        <td key={m.manager}>
                          <span className="chip">
                            <i className="dot" style={{ background: slot.team.color }} />
                            <span>
                              {slot.team.nick}{" "}
                              <span className="muted num" style={{ fontSize: 12 }}>
                                {recordString(slot.record)}
                              </span>
                            </span>
                          </span>
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td className="divlabel">Total</td>
                {s.table
                  .slice()
                  .sort((a, b) => a.rank - b.rank)
                  .map((m) => (
                    <td key={m.manager} className="num big">{fmt(m.points)}</td>
                  ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export function Problems({ s }: { s: SeasonData }) {
  if (!s.problems.length) return null;
  return (
    <div className="notice">
      <h3>Check the roster file</h3>
      <p>
        {s.problems.map((p) => (
          <span key={p} style={{ display: "block" }}>{p}</span>
        ))}
        Fix these in <code>data/rosters.json</code> and redeploy.
      </p>
    </div>
  );
}
