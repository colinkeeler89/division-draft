import { managerColor } from "@/lib/colors";
import type { CareerRow, SeasonView } from "@/lib/pool";

const ORDINAL = ["", "1st", "2nd", "3rd", "4th"];

/**
 * Place-by-season grid. The aggregate career table flattens a manager's shape —
 * five titles and no runner-up finishes averages out to look like four seconds
 * and a win. This shows the shape instead, and makes a frozen table obvious.
 */
export default function PlacementGrid({
  seasons,
  career,
  frozen,
}: {
  seasons: SeasonView[]; // completed, any order
  career: CareerRow[];
  frozen: number[]; // seasons at the tail sharing one finishing order
}) {
  const chrono = [...seasons].sort((a, b) => a.season - b.season);
  const placeOf = (s: SeasonView, manager: string) =>
    s.table.find((m) => m.manager === manager)?.rank ?? 0;

  return (
    <div className="card">
      <div className="card-head">
        <h2>Where everyone finished</h2>
        <span className="card-note">
          place by season · {chrono[0]?.season}–{chrono[chrono.length - 1]?.season}
        </span>
      </div>
      <div className="card-body flush">
        <div className="pgwrap">
          <table className="pgrid">
            <thead>
              <tr>
                <th>Manager</th>
                {chrono.map((s) => (
                  <th key={s.season} className={frozen.includes(s.season) ? "freeze" : undefined}>
                    {String(s.season).slice(2)}
                  </th>
                ))}
                <th style={{ textAlign: "right" }}>Top 2</th>
              </tr>
            </thead>
            <tbody>
              {career.map((c) => (
                <tr key={c.manager}>
                  <th scope="row">
                    <span className="mgr">
                      <i className="swatch" style={{ background: managerColor(c.manager) }} />
                      {c.manager}
                    </span>
                  </th>
                  {chrono.map((s) => {
                    const p = placeOf(s, c.manager);
                    return (
                      <td key={s.season} className={frozen.includes(s.season) ? "freeze" : undefined}>
                        <span
                          className={`cell p${p}`}
                          style={{ ["--mc" as string]: managerColor(c.manager) }}
                          title={`${s.season}: ${ORDINAL[p]}`}
                        >
                          {p}
                        </span>
                      </td>
                    );
                  })}
                  <td className="pgtot">{c.finishes[0] + c.finishes[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="pgkey">
        <span><i style={{ background: "var(--gold)" }} />Won it</span>
        <span>
          <i style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--s1) 26%, var(--surface-2)) 50%, color-mix(in srgb, var(--s3) 26%, var(--surface-2)) 50%)",
          }} />
          Runner-up, tinted to the manager
        </span>
        <span><i style={{ background: "var(--surface-2)" }} />3rd or 4th</span>
        {frozen.length > 1 && (
          <span>
            <i className="freeze" style={{ border: "1px solid var(--line)" }} />
            Same order {frozen.length} years running
          </span>
        )}
      </div>
    </div>
  );
}
