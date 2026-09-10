import { managerColor } from "@/lib/colors";
import type { Projection } from "@/lib/projection";
import { fmt } from "@/lib/pool";

/**
 * Two readings of the same simulation: who wins, and where everyone lands.
 * The range plot shares one scale across all four rows so the bars are
 * comparable; the win-probability column is the headline.
 */
export default function ProjectionCard({ p }: { p: Projection }) {
  if (!p.gamesLeft) return null;

  const lo = Math.floor(Math.min(...p.rows.map((r) => r.low)) / 5) * 5;
  const hi = Math.ceil(Math.max(...p.rows.map((r) => r.high)) / 5) * 5;
  const span = Math.max(1, hi - lo);
  const x = (v: number) => ((v - lo) / span) * 100;

  const leader = p.rows[0];
  const preseason = p.week === 0;

  return (
    <div className="card">
      <div className="card-head">
        <h2>Projected finish</h2>
        <span className="card-note">
          {p.sims.toLocaleString()} simulations · {p.gamesLeft} games left
        </span>
      </div>

      <div className="card-body flush">
        <div className="projrows">
          {p.rows.map((r) => (
            <div className="projrow" key={r.manager}>
              <span className="pname">
                <i className="swatch" style={{ background: managerColor(r.manager) }} />
                {r.manager}
              </span>

              <span className="pwin">
                <span className="pwinbar">
                  <span
                    style={{ width: `${Math.max(1, r.winProb * 100)}%`, background: managerColor(r.manager) }}
                  />
                </span>
                <b>{r.winProb < 0.005 ? "<1" : Math.round(r.winProb * 100)}%</b>
              </span>

              <span className="prange">
                <span className="ptrack">
                  <span
                    className="pband"
                    style={{
                      left: `${x(r.low)}%`,
                      width: `${Math.max(1.5, x(r.high) - x(r.low))}%`,
                      background: managerColor(r.manager),
                    }}
                  />
                  <i className="pdot" style={{ left: `${x(r.projected)}%`, background: managerColor(r.manager) }} />
                </span>
              </span>

              <span className="pnum">
                {fmt(Math.round(r.projected * 10) / 10)}
                <small>
                  {Math.round(r.low)}–{Math.round(r.high)}
                </small>
              </span>
            </div>
          ))}

          <div className="projaxis">
            <span className="cap">win odds</span>
            <span className="ticks">
              {Array.from({ length: Math.floor(span / 5) + 1 }, (_, i) => lo + i * 5).map((v) => (
                <span key={v} style={{ left: `${x(v)}%` }}>{v}</span>
              ))}
            </span>
            <span className="cap" style={{ textAlign: "right" }}>proj. pts</span>
          </div>
        </div>
      </div>

      <div className="projnote">
        {preseason ? (
          <>
            <strong>Preseason, so treat this lightly.</strong> Backtested on the eleven seasons on
            record, the week-zero favourite won the pool 3 times in 11 — barely better than picking a
            name out of a hat. It sharpens fast: by week 8 the favourite is right about half the time,
            and by week 16, 11 times out of 11.
          </>
        ) : (
          <>
            <strong>{leader.manager}</strong> projects to finish on {fmt(Math.round(leader.projected))}{" "}
            with a {Math.round(leader.winProb * 100)}% chance of taking it. Bars span the middle 80% of
            simulated outcomes. Across 396 backtested predictions these odds score a Brier of 0.124
            against 0.188 for always guessing 25% — real skill, but the week-{p.week} favourite still
            loses often enough to keep it interesting.
          </>
        )}
      </div>
    </div>
  );
}
