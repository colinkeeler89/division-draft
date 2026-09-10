import DivisionHeatmap from "@/components/DivisionHeatmap";
import { managerColor } from "@/lib/colors";
import { fetchStandingsSafe } from "@/lib/nfl";
import FeedDown from "@/components/FeedDown";
import { divisionHeat, extremes, headToHead } from "@/lib/analytics";
import { MANAGERS, SEASONS, buildSeason, recordString } from "@/lib/pool";

export const revalidate = 900;

export const metadata = {
  title: "Analytics — Division Draft",
  description: "Division strengths, head-to-head records, and the best and worst picks in pool history.",
};

export default async function Analytics() {
  // Season records are all this page needs, so it never touches the game-level
  // feed — one 56 KB request serves the whole page.
  const { table: standings, ok: feedOk } = await fetchStandingsSafe();
  const played = SEASONS.map((y) => buildSeason(standings, y)).filter((s) => s.drafted && s.started);

  const heat = divisionHeat(played);
  const h2h = headToHead(played);
  const { best, worst, total } = extremes(played);

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">Analytics</p>
        <h1>Where the wins come from</h1>
        <p className="sub">
          The standings say who won. These say how — which divisions each manager keeps getting
          right, who has the beating of whom, and the picks nobody has lived down.
        </p>
      </div>

      {!feedOk && <FeedDown />}
      {heat && <DivisionHeatmap heat={heat} />}

      <div className="card">
        <div className="card-head">
          <h2>Head to head</h2>
          <span className="card-note">seasons finished above each other</span>
        </div>
        <div className="card-body flush">
          <div className="tablescroll">
            <table className="h2h">
              <thead>
                <tr>
                  <th>&nbsp;</th>
                  {MANAGERS.map((m) => (
                    <th key={m}>vs {m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MANAGERS.map((a) => (
                  <tr key={a}>
                    <th>
                      <span className="mgr">
                        <i className="swatch" style={{ background: managerColor(a) }} />
                        {a}
                      </span>
                    </th>
                    {MANAGERS.map((b) =>
                      a === b ? (
                        <td key={b} className="muted">—</td>
                      ) : (
                        <td key={b} className={h2h[a][b] > h2h[b][a] ? "h2hwin" : undefined}>
                          <span className="num">
                            {h2h[a][b]}–{h2h[b][a]}
                          </span>
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>The extremes</h2>
          <span className="card-note">of {total} picks made</span>
        </div>
        <div className="card-body">
          <div className="extremes">
            {[
              { label: "Best picks ever", list: best },
              { label: "Worst picks ever", list: worst },
            ].map(({ label, list }) => (
              <div className="exlist" key={label}>
                <div className="exhd">{label}</div>
                {list.map((p) => (
                  <div className="exrow" key={`${p.season}-${p.team}`}>
                    <span className="yr">{String(p.season).slice(2)}</span>
                    <span className="tm">
                      <i className="swatch" style={{ background: p.color, marginRight: 8 }} />
                      {p.team}
                    </span>
                    <span className="mg">
                      <i className="swatch" style={{ background: managerColor(p.manager) }} />
                      {p.manager}
                    </span>
                    <span className="num" style={{ fontSize: 13 }}>{recordString(p.record)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
