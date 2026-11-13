"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Existing design tokens (tailwind.config.ts) as hex, for SVG and inline styles. No new colours. */
export const TOKENS = {
  slate: "#34495E",
  slateLight: "#46607A",
  info: "#2A5C8A",
  line: "#D9D5CE",
  muted: "#525656",
  ink: "#3A3D3E",
  heading: "#292C2D",
} as const;

export type Pattern = "solid" | "hatch" | "dots" | "cross";
export interface Series { id: string; label: string; color: string; pattern?: Pattern }
export const PATTERN_CYCLE: Pattern[] = ["solid", "hatch", "dots", "cross", "solid"];

const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");

/** Colour plus a pattern, so series differ by more than colour. */
export function patternStyle(s: Series): CSSProperties {
  const base: CSSProperties = { backgroundColor: s.color };
  const hatch = "repeating-linear-gradient(45deg, rgba(255,255,255,.6) 0 2px, transparent 2px 6px)";
  const hatch2 = "repeating-linear-gradient(-45deg, rgba(255,255,255,.6) 0 2px, transparent 2px 6px)";
  if (s.pattern === "hatch") return { ...base, backgroundImage: hatch };
  if (s.pattern === "dots") return { ...base, backgroundImage: "radial-gradient(rgba(255,255,255,.75) 1.2px, transparent 1.6px)", backgroundSize: "6px 6px" };
  if (s.pattern === "cross") return { ...base, backgroundImage: `${hatch}, ${hatch2}` };
  return base;
}

function PatternDefs({ uid, series }: { uid: string; series: Series[] }) {
  return (
    <defs>
      {series.map((s) => {
        if (!s.pattern || s.pattern === "solid") return null;
        return (
          <pattern key={s.id} id={`${uid}-${clean(s.id)}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform={s.pattern === "dots" ? undefined : "rotate(45)"}>
            <rect width="6" height="6" fill={s.color} />
            {(s.pattern === "hatch" || s.pattern === "cross") && <line x1="0" y1="0" x2="0" y2="6" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />}
            {s.pattern === "cross" && <line x1="0" y1="3" x2="6" y2="3" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />}
            {s.pattern === "dots" && <circle cx="3" cy="3" r="1.2" fill="#fff" fillOpacity=".75" />}
          </pattern>
        );
      })}
    </defs>
  );
}

const fillOf = (uid: string, s: Series) => (!s.pattern || s.pattern === "solid" ? s.color : `url(#${uid}-${clean(s.id)})`);

function useWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (w: number) => setWidth(Math.max(240, Math.round(w)));
    measure(el.getBoundingClientRect().width || fallback);
    const ro = new ResizeObserver((entries) => {
      const first = entries[0];
      if (first) measure(first.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

function niceScale(min: number, max: number, count: number, integer: boolean) {
  let lo = Math.min(0, min);
  let hi = Math.max(0, max);
  if (hi === lo) hi = lo + 1;
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  if (integer && step < 1) step = 1;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return { lo, hi, ticks };
}

/** One sentence for screen readers: highest and lowest value. */
export function describeSeries(name: string, labels: string[], values: number[], fmt: (n: number) => string): string {
  if (!values.length) return `${name}: no data.`;
  let hi = 0;
  let lo = 0;
  values.forEach((v, i) => {
    if (v > values[hi]) hi = i;
    if (v < values[lo]) lo = i;
  });
  return `${name} across ${values.length} periods. Highest ${fmt(values[hi])} (${labels[hi]}), lowest ${fmt(values[lo])} (${labels[lo]}). The same numbers are in the table view.`;
}

// ───────────────────────── legend ─────────────────────────
export interface LegendItem { label: string; series?: Series; line?: { color: string; dashed?: boolean } }

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          {it.series && <span className="size-3.5 shrink-0 rounded-sm border border-black/10" style={patternStyle(it.series)} aria-hidden />}
          {it.line && (
            <svg width="24" height="10" aria-hidden className="shrink-0">
              <line x1="0" y1="5" x2="24" y2="5" stroke={it.line.color} strokeWidth="2" strokeDasharray={it.line.dashed ? "5 4" : undefined} />
              {!it.line.dashed && <circle cx="12" cy="5" r="3" fill={it.line.color} />}
            </svg>
          )}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── column chart (bars + lines over time) ─────────────────────────
export interface BarSeries { series: Series; values: number[] }
export interface LineSeries { series: Series; values: (number | null)[]; dashed?: boolean; axis?: "left" | "right" }

interface ColumnChartProps {
  points: { key: string; label: string }[];
  bars: BarSeries[];
  lines?: LineSeries[];
  stacked?: boolean;
  format: (n: number) => string;
  rightFormat?: (n: number) => string;
  integer?: boolean;
  summary: string;
  /** Write values above bars. Defaults to on for up to 8 periods; the table view always has every value. */
  showValues?: boolean;
}

function linePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

export function ColumnChart({ points, bars, lines = [], stacked = false, format, rightFormat = (n) => String(n), integer = false, summary, showValues }: ColumnChartProps) {
  const uid = clean(useId());
  const [ref, width] = useWidth();
  const height = width < 480 ? 220 : 280;
  const rightLines = lines.filter((l) => l.axis === "right");
  const leftLines = lines.filter((l) => l.axis !== "right");
  const m = { top: 18, right: rightLines.length ? 46 : 10, bottom: 30, left: 56 };
  const plotW = Math.max(60, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;
  const n = points.length;

  let lo = 0;
  let hi = 0;
  if (stacked) {
    for (let i = 0; i < n; i++) {
      let pos = 0;
      let neg = 0;
      bars.forEach((b) => {
        const v = b.values[i] ?? 0;
        if (v >= 0) pos += v;
        else neg += v;
      });
      hi = Math.max(hi, pos);
      lo = Math.min(lo, neg);
    }
  } else {
    bars.forEach((b) => b.values.forEach((v) => { hi = Math.max(hi, v); lo = Math.min(lo, v); }));
  }
  leftLines.forEach((l) => l.values.forEach((v) => { if (v !== null) { hi = Math.max(hi, v); lo = Math.min(lo, v); } }));
  const L = niceScale(lo, hi, 4, integer);

  let rlo = 0;
  let rhi = 0;
  rightLines.forEach((l) => l.values.forEach((v) => { if (v !== null) { rhi = Math.max(rhi, v); rlo = Math.min(rlo, v); } }));
  const R = niceScale(rlo, rhi, 4, false);

  const y = (v: number) => m.top + plotH - ((v - L.lo) / (L.hi - L.lo)) * plotH;
  const yr = (v: number) => m.top + plotH - ((v - R.lo) / (R.hi - R.lo)) * plotH;
  const band = plotW / Math.max(n, 1);
  const cx = (i: number) => m.left + band * (i + 0.5);
  const labelValues = showValues ?? n <= 8;
  const maxLabels = Math.max(2, Math.floor(plotW / 60));
  const step = Math.ceil(n / maxLabels);

  const allSeries = [...bars.map((b) => b.series), ...lines.map((l) => l.series)];
  const barEls: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    if (stacked) {
      const bw = Math.min(band * 0.6, 48);
      let pos = 0;
      let neg = 0;
      bars.forEach((b, j) => {
        const v = b.values[i] ?? 0;
        if (!v) return;
        const from = v >= 0 ? pos : neg;
        const to = from + v;
        if (v >= 0) pos = to;
        else neg = to;
        const top = y(Math.max(from, to));
        const bottom = y(Math.min(from, to));
        barEls.push(<rect key={`b-${i}-${j}`} x={cx(i) - bw / 2} y={top} width={bw} height={Math.max(0, bottom - top)} fill={fillOf(uid, b.series)} />);
      });
      if (labelValues && pos + neg !== 0) {
        barEls.push(
          <text key={`t-${i}`} x={cx(i)} y={y(pos) - 4} textAnchor="middle" fontSize="10" fill={TOKENS.ink}>{format(pos + neg)}</text>,
        );
      }
    } else {
      const gw = Math.min(band * 0.7, 56 * bars.length);
      const bw = gw / bars.length;
      bars.forEach((b, j) => {
        const v = b.values[i] ?? 0;
        const x0 = cx(i) - gw / 2 + j * bw;
        const top = Math.min(y(v), y(0));
        const h = Math.abs(y(v) - y(0));
        barEls.push(<rect key={`b-${i}-${j}`} x={x0} y={top} width={Math.max(1, bw - 2)} height={h} fill={fillOf(uid, b.series)} />);
        if (labelValues && v !== 0 && bw >= 26) {
          barEls.push(
            <text key={`t-${i}-${j}`} x={x0 + (bw - 2) / 2} y={v >= 0 ? top - 4 : top + h + 11} textAnchor="middle" fontSize="10" fill={TOKENS.ink}>{format(v)}</text>,
          );
        }
      });
    }
  }

  return (
    <div ref={ref} className="w-full">
      <svg role="img" aria-label={summary} viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="block overflow-visible">
        <title>{summary}</title>
        <PatternDefs uid={uid} series={allSeries} />
        {L.ticks.map((t) => (
          <g key={`g-${t}`}>
            <line x1={m.left} x2={m.left + plotW} y1={y(t)} y2={y(t)} stroke={t === 0 && L.lo < 0 ? TOKENS.muted : TOKENS.line} strokeOpacity={t === 0 && L.lo < 0 ? 0.8 : 0.9} />
            <text x={m.left - 6} y={y(t) + 3.5} textAnchor="end" fontSize="11" fill={TOKENS.muted}>{format(t)}</text>
          </g>
        ))}
        {rightLines.length > 0 && R.ticks.map((t) => (
          <text key={`r-${t}`} x={m.left + plotW + 6} y={yr(t) + 3.5} textAnchor="start" fontSize="11" fill={TOKENS.muted}>{rightFormat(t)}</text>
        ))}
        {barEls}
        {lines.map((l) => {
          const yy = l.axis === "right" ? yr : y;
          return (
            <g key={l.series.id}>
              <path d={linePath(l.values, cx, yy)} fill="none" stroke={l.series.color} strokeWidth={2} strokeDasharray={l.dashed ? "5 4" : undefined} strokeLinejoin="round" />
              {!l.dashed && n <= 40 && l.values.map((v, i) => (v === null ? null : <circle key={i} cx={cx(i)} cy={yy(v)} r={3.5} fill="#fff" stroke={l.series.color} strokeWidth={2} />))}
            </g>
          );
        })}
        {points.map((p, i) =>
          i % step === 0 ? (
            <text key={p.key} x={cx(i)} y={height - 10} textAnchor="middle" fontSize="11" fill={TOKENS.muted}>{p.label}</text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

// ───────────────────────── horizontal rows ─────────────────────────
export interface BarSegment { series: Series; value: number; text?: string }
export interface BarRow { key: string; label: ReactNode; caption?: string; segments: BarSegment[]; valueText?: string; flag?: ReactNode }

/** Horizontal bars as a real list: every row carries its numbers as text. */
export function BarRows({ rows, mode, max, marker, summary }: {
  rows: BarRow[];
  mode: "stacked" | "grouped";
  max?: number;
  marker?: { value: number; label: string };
  summary: string;
}) {
  let top = max ?? 0;
  if (max === undefined) {
    rows.forEach((r) => {
      const v = mode === "stacked" ? r.segments.reduce((a, s) => a + Math.max(0, s.value), 0) : Math.max(0, ...r.segments.map((s) => s.value));
      top = Math.max(top, v);
    });
  }
  if (marker) top = Math.max(top, marker.value * 1.15);
  if (top <= 0) top = 1;
  const w = (v: number) => `${Math.min(100, (Math.max(0, v) / top) * 100)}%`;
  const markerEl = marker ? (
    <span className="absolute -bottom-1 -top-1 w-0.5 bg-ink-heading" style={{ left: w(marker.value) }} aria-hidden />
  ) : null;

  return (
    <ul aria-label={summary} className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(5.5rem,8rem)_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[10rem_1fr]">
          <div className="min-w-0 break-words text-sm font-medium text-ink-heading">
            {r.label}
            {r.caption && <span className="block text-xs font-normal text-ink-muted">{r.caption}</span>}
          </div>
          <div className="min-w-0">
            {mode === "stacked" ? (
              <div className="flex items-center gap-2">
                <div className="relative h-5 flex-1 rounded-sm bg-line/40">
                  <div className="flex h-full overflow-hidden rounded-sm">
                    {r.segments.map((s) => (
                      <div key={s.series.id} className="h-full" style={{ width: w(s.value), ...patternStyle(s.series) }} title={`${s.series.label}${s.text ? `: ${s.text}` : ""}`} />
                    ))}
                  </div>
                  {markerEl}
                </div>
                {r.valueText && <span className="min-w-[4.5rem] shrink-0 text-right text-sm font-medium tabular-nums text-ink-heading">{r.valueText}</span>}
              </div>
            ) : (
              <div className="space-y-1.5">
                {r.segments.map((s) => (
                  <div key={s.series.id} className="flex items-center gap-2">
                    <div className="relative h-4 flex-1 rounded-sm bg-line/40">
                      <div className="h-full rounded-sm" style={{ width: w(s.value), ...patternStyle(s.series) }} />
                      {markerEl}
                    </div>
                    <span className="w-32 shrink-0 text-right text-[13px] tabular-nums text-ink-heading">
                      <span className="text-ink-muted">{s.series.label} </span>
                      {s.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {r.flag && <div className="mt-1">{r.flag}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── donut ─────────────────────────
export interface DonutSlice { key: string; label: string; value: number; color: string; pattern: Pattern; detail: string }

export function Donut({ slices, centerLabel, centerValue, summary }: { slices: DonutSlice[]; centerLabel: string; centerValue: string; summary: string }) {
  const uid = clean(useId());
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  const r = 70;
  const C = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 2 : 0;
  const series: Series[] = slices.map((s) => ({ id: s.key, label: s.label, color: s.color, pattern: s.pattern }));
  let acc = 0;

  return (
    <div className="flex flex-col items-center gap-5 md:flex-row md:items-center">
      <svg role="img" aria-label={summary} viewBox="0 0 200 200" className="size-44 shrink-0 md:size-48">
        <title>{summary}</title>
        <PatternDefs uid={uid} series={series} />
        <circle cx="100" cy="100" r={r} fill="none" stroke={TOKENS.line} strokeOpacity=".4" strokeWidth="30" />
        <g transform="rotate(-90 100 100)">
          {total > 0 && slices.map((s, i) => {
            const len = (Math.max(0, s.value) / total) * C;
            const el = (
              <circle key={s.key} cx="100" cy="100" r={r} fill="none" stroke={fillOf(uid, series[i])} strokeWidth="30" strokeDasharray={`${Math.max(len - gap, 0)} ${C}`} strokeDashoffset={-(acc + gap / 2)} />
            );
            acc += len;
            return el;
          })}
        </g>
        <text x="100" y="96" textAnchor="middle" fontSize="11" fill={TOKENS.muted}>{centerLabel}</text>
        <text x="100" y="116" textAnchor="middle" fontSize="16" fontWeight="600" fill={TOKENS.heading}>{centerValue}</text>
      </svg>
      <ul aria-label="Share by lab" className="w-full min-w-0 flex-1 space-y-2.5">
        {slices.map((s, i) => (
          <li key={s.key} className="flex items-start gap-2.5 text-sm">
            <span className="mt-0.5 size-3.5 shrink-0 rounded-sm border border-black/10" style={patternStyle(series[i])} aria-hidden />
            <span className="min-w-0">
              <span className="block font-medium text-ink-heading">{s.label}</span>
              <span className="block text-[13px] tabular-nums text-ink-muted">{s.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── sparkline ─────────────────────────
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`).join(" ");
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={cn("block shrink-0")}>
      <title>{label}</title>
      <polyline points={pts} fill="none" stroke={TOKENS.slate} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}