"use client";

import { useState } from "react";
import { MANAGERS, type Manager } from "@/lib/pool";

export type Series = { manager: Manager; color: string; values: (number | null)[] };

type Props = {
  labels: string[];
  series: Series[];
  yLabel?: string;
  /** Axis caption under the x axis. */
  xLabel?: string;
};

const W = 860;
const H = 320;
const PAD = { top: 16, right: 74, bottom: 34, left: 42 };

export default function RaceChart({ labels, series, yLabel, xLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const n = labels.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const max = Math.max(1, ...all);

  // Round the top of the scale up to a step that divides evenly, so the axis
  // reads 0/20/40/60/80 rather than 0/23/45/68/90.
  const ticks = 4;
  const rough = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= rough) ?? 10 * mag;
  const niceMax = step * ticks;

  const x = (i: number) => (n <= 1 ? PAD.left + plotW / 2 : PAD.left + (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / niceMax) * plotH;

  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => step * i);

  // Show at most ~12 x labels so they never collide.
  const labelStep = Math.max(1, Math.ceil(n / 12));

  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`;
      pen = true;
    });
    return d;
  };

  // End-of-line direct labels, nudged apart so they never overlap.
  const ends = series
    .map((s) => {
      let last = -1;
      s.values.forEach((v, i) => { if (v !== null) last = i; });
      return last < 0 ? null : { s, i: last, v: s.values[last] as number };
    })
    .filter((e): e is { s: Series; i: number; v: number } => e !== null)
    .sort((a, b) => a.v - b.v);

  const labelY: number[] = [];
  ends.forEach((e, k) => {
    let ly = y(e.v);
    if (k > 0 && labelY[k - 1] - ly < 15) ly = labelY[k - 1] - 15;
    labelY.push(ly);
  });

  const hoverX = hover !== null ? x(hover) : 0;
  const tipLeft = hover !== null ? (hoverX / W) * 100 : 0;
  const flip = tipLeft > 62;

  return (
    <div className="chartwrap">
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${yLabel ?? "Points"} by ${xLabel ?? "period"} for ${MANAGERS.join(", ")}`}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end">{t}</text>
          </g>
        ))}

        {labels.map((lab, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text key={i} className="axis" x={x(i)} y={H - PAD.bottom + 16} textAnchor="middle">{lab}</text>
          ) : null,
        )}
        {xLabel && (
          <text className="axis" x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle" opacity={0.75}>
            {xLabel}
          </text>
        )}

        {series.map((s) => (
          <path
            key={s.manager}
            d={path(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {hover !== null && (
          <>
            <line className="crosshair" style={{ opacity: 1 }} x1={hoverX} x2={hoverX} y1={PAD.top} y2={PAD.top + plotH} />
            {series.map((s) => {
              const v = s.values[hover];
              return v === null ? null : (
                <circle key={s.manager} cx={hoverX} cy={y(v)} r={4.5} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
              );
            })}
          </>
        )}

        {ends.map((e, k) => (
          <text
            key={e.s.manager}
            className="serieslabel"
            x={x(e.i) + 9}
            y={labelY[k] + 4}
            fill={e.s.color}
          >
            {e.s.manager} {Number.isInteger(e.v) ? e.v : e.v.toFixed(1)}
          </text>
        ))}

        {labels.map((_, i) => (
          <rect
            key={i}
            className="hitband"
            x={x(i) - plotW / Math.max(1, n - 1) / 2}
            y={PAD.top}
            width={plotW / Math.max(1, n - 1)}
            height={plotH}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          className="tooltip"
          style={{
            left: flip ? undefined : `calc(${tipLeft}% + 14px)`,
            right: flip ? `calc(${100 - tipLeft}% + 14px)` : undefined,
            top: 8,
          }}
        >
          <div className="tt-head">{labels[hover]}</div>
          {[...series]
            .filter((s) => s.values[hover] !== null)
            .sort((a, b) => (b.values[hover] as number) - (a.values[hover] as number))
            .map((s) => (
              <div className="tt-row" key={s.manager}>
                <span className="chip">
                  <i className="dot" style={{ background: s.color }} />
                  {s.manager}
                </span>
                <span>{(s.values[hover] as number).toFixed(1).replace(/\.0$/, "")}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
