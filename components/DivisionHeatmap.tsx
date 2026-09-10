"use client";

import { useEffect, useState } from "react";
import { managerColor } from "@/lib/colors";
import type { DivisionHeat } from "@/lib/analytics";
import { MANAGERS } from "@/lib/pool";
import { DIVISIONS } from "@/lib/teams";

/**
 * Sequential encoding: one hue, stepped for the ground it sits on. The dark
 * ramp is not the light ramp flipped — each is chosen to gain contrast against
 * its own surface as the value rises.
 */
const RAMP_LIGHT = ["#eaf1fb", "#cde2fb", "#9ec5f4", "#5598e7", "#2a78d6"];
const RAMP_DARK = ["#1b2836", "#1c3a5c", "#205081", "#2a6fb5", "#3987e5"];
const INK_LIGHT = ["#2a2a22", "#16150f", "#16150f", "#fbfaf7", "#fbfaf7"];
const INK_DARK = ["#d8d5cb", "#e4e2d8", "#f6f5f0", "#f6f5f0", "#f6f5f0"];

function useIsDark() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const read = () => {
      const stamped = document.documentElement.getAttribute("data-theme");
      setDark(stamped ? stamped === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    read();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", read);
      mo.disconnect();
    };
  }, []);
  return dark;
}

export default function DivisionHeatmap({ heat }: { heat: DivisionHeat }) {
  const dark = useIsDark();
  const ramp = dark ? RAMP_DARK : RAMP_LIGHT;
  const ink = dark ? INK_DARK : INK_LIGHT;
  const step = (v: number) =>
    Math.min(4, Math.max(0, Math.floor(((v - heat.min) / (heat.max - heat.min || 1)) * 5)));

  return (
    <div className="card">
      <div className="card-head">
        <h2>Who owns which division</h2>
        <span className="card-note">average points per pick</span>
      </div>
      <div className="card-body flush">
        <div className="pgwrap">
          <table className="heat">
            <thead>
              <tr>
                <th>Manager</th>
                {DIVISIONS.map((d) => (
                  <th key={d}>
                    {d.split(" ")[0]}
                    <br />
                    {d.split(" ")[1]}
                  </th>
                ))}
                <th>Best in div.</th>
              </tr>
            </thead>
            <tbody>
              {MANAGERS.map((m) => (
                <tr key={m}>
                  <th scope="row">
                    <span className="mgr">
                      <i className="swatch" style={{ background: managerColor(m) }} />
                      {m}
                    </span>
                  </th>
                  {DIVISIONS.map((d) => {
                    const v = heat.cell[m][d];
                    const k = step(v);
                    return (
                      <td key={d}>
                        <span
                          className="hc"
                          style={{ background: ramp[k], color: ink[k] }}
                          title={`${m}, ${d}: ${v.toFixed(2)} points per pick`}
                        >
                          {v.toFixed(1)}
                        </span>
                      </td>
                    );
                  })}
                  <td>
                    <span className="hc" style={{ background: "transparent", color: "var(--ink)" }}>
                      {heat.bestInDivision[m].toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="heatkey">
        <span>Fewer wins</span>
        <span className="heatramp">
          {ramp.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </span>
        <span>More wins</span>
        <span className="muted">
          — best: {heat.best.manager} in the {heat.best.division} ({heat.best.value.toFixed(2)}). Worst:{" "}
          {heat.worst.manager} in the {heat.worst.division} ({heat.worst.value.toFixed(2)}).
        </span>
      </div>
    </div>
  );
}
