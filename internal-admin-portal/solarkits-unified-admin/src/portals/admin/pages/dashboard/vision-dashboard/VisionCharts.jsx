/**
 * VisionCharts.jsx
 *
 * Reusable inline-SVG chart primitives for the Vision Dashboard.
 * No external charting library needed — pure SVG + CSS.
 *
 * Exports:
 *   <ProgressBar />       – horizontal fill bar
 *   <DonutChart />        – single-value donut arc
 *   <BarChart />          – vertical bar chart
 *   <LineChart />         – smooth line / area chart
 *   <MiniSparkline />     – tiny sparkline for KPI cards
 *   <GroupedBarChart />   – side-by-side bars (goal vs actual)
 *   <HorizontalBarChart />– horizontal ranked bars
 */

import { useMemo } from 'react';

// ── ProgressBar ──────────────────────────────────────────────────────────────

export function ProgressBar({
  value = 0,          // 0-100
  colorClass = 'bg-primary',
  height = 6,
  showLabel = false,
  labelPosition = 'right',
  animated = true,
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="flex items-center gap-2 w-full">
      {showLabel && labelPosition === 'left' && (
        <span className="text-xs text-text-secondary w-8 text-right shrink-0">{Math.round(pct)}%</span>
      )}
      <div
        className="flex-1 bg-border rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className={`h-full rounded-full ${colorClass} ${animated ? 'transition-all duration-700 ease-out' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && labelPosition === 'right' && (
        <span className="text-xs text-text-secondary w-8 shrink-0">{Math.round(pct)}%</span>
      )}
    </div>
  );
}

// ── DonutChart ───────────────────────────────────────────────────────────────

export function DonutChart({
  value = 0,          // 0-100+
  size = 80,
  strokeWidth = 8,
  color = '#263880',
  trackColor = '#e2e8f0',
  label = null,
  sublabel = null,
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value, 100);
  const dashOffset = circ - (pct / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={cx} cy={cy} r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          {label   && <span className="text-sm font-bold text-text-primary leading-none">{label}</span>}
          {sublabel && <span className="text-[10px] text-text-muted mt-0.5">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

// ── BarChart ─────────────────────────────────────────────────────────────────

export function BarChart({
  data = [],          // [{ label, value, color? }]
  height = 160,
  barColor = '#263880',
  showValues = true,
  maxValue = null,
}) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(20, Math.floor(280 / Math.max(data.length, 1)) - 6);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={Math.max(data.length * (barW + 6), 300)}
        height={height + 40}
        className="overflow-visible"
      >
        {data.map((d, i) => {
          const barH = Math.max(((d.value / max) * height), 2);
          const x = i * (barW + 6) + 3;
          const y = height - barH;
          const clr = d.color || barColor;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill={clr} rx={3}
                style={{ transition: 'height 0.6s ease, y 0.6s ease' }}
              />
              {showValues && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                  fontSize={10} fill="var(--color-text-secondary)">{d.value}</text>
              )}
              <text x={x + barW / 2} y={height + 16} textAnchor="middle"
                fontSize={9} fill="var(--color-text-muted)"
                className="truncate"
              >
                {d.label?.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── LineChart ────────────────────────────────────────────────────────────────

export function LineChart({
  data = [],          // [{ label, value }]
  width = 400,
  height = 140,
  color = '#263880',
  fillOpacity = 0.12,
  showDots = true,
  showLabels = true,
}) {
  const { points, pathD, areaD } = useMemo(() => {
    if (data.length < 2) return { points: [], pathD: '', areaD: '' };
    const max = Math.max(...data.map(d => d.value), 1);
    const min = Math.min(...data.map(d => d.value), 0);
    const range = max - min || 1;
    const padX = 20, padY = 16;
    const w = width - padX * 2;
    const h = height - padY * 2;

    const pts = data.map((d, i) => ({
      x: padX + (i / (data.length - 1)) * w,
      y: padY + h - ((d.value - min) / range) * h,
      ...d,
    }));

    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${path} L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`;
    return { points: pts, pathD: path, areaD: area };
  }, [data, width, height]);

  if (data.length < 2) return (
    <div className="flex items-center justify-center h-full text-text-muted text-sm">Not enough data</div>
  );

  return (
    <svg width={width} height={height} className="overflow-visible w-full">
      {/* Area fill */}
      <path d={areaD} fill={color} fillOpacity={fillOpacity} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      {/* Dots */}
      {showDots && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke="var(--color-surface)" strokeWidth={1.5} />
      ))}
      {/* X labels */}
      {showLabels && points.map((p, i) => (
        <text key={i} x={p.x} y={height - 2} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">
          {p.label?.length > 5 ? p.label.slice(0, 4) + '…' : p.label}
        </text>
      ))}
    </svg>
  );
}

// ── MiniSparkline ─────────────────────────────────────────────────────────────

export function MiniSparkline({ data = [], color = '#263880', width = 80, height = 32 }) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((v - min) / range) * height,
    }));
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [data, width, height]);

  if (!path) return null;
  return (
    <svg width={width} height={height} className="overflow-visible opacity-70">
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── GroupedBarChart (Goal vs Actual) ─────────────────────────────────────────

export function GroupedBarChart({
  data = [],          // [{ label, goal, actual }]
  height = 180,
  goalColor = '#94a3b8',
  actualColor = '#263880',
  showValues = true,
}) {
  const max = Math.max(...data.flatMap(d => [d.goal, d.actual]), 1);
  const barW = 12;
  const gap = 3;
  const groupW = barW * 2 + gap * 3;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1 mb-2">
        <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: goalColor }} />
        <span className="text-xs text-text-secondary mr-3">Goal</span>
        <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: actualColor }} />
        <span className="text-xs text-text-secondary">Actual</span>
      </div>
      <svg width={Math.max(data.length * groupW + 20, 300)} height={height + 32} className="overflow-visible">
        {data.map((d, i) => {
          const gH = Math.max(((d.goal   / max) * height), 2);
          const aH = Math.max(((d.actual / max) * height), 2);
          const x  = i * groupW + 10;
          return (
            <g key={i}>
              {/* Goal bar */}
              <rect x={x + gap} y={height - gH} width={barW} height={gH} fill={goalColor} rx={2} />
              {/* Actual bar */}
              <rect x={x + gap + barW + gap} y={height - aH} width={barW} height={aH} fill={actualColor} rx={2} />
              {showValues && (
                <>
                  <text x={x + gap + barW / 2} y={height - gH - 3} textAnchor="middle" fontSize={8} fill="var(--color-text-muted)">{d.goal}</text>
                  <text x={x + gap + barW + gap + barW / 2} y={height - aH - 3} textAnchor="middle" fontSize={8} fill={actualColor}>{d.actual}</text>
                </>
              )}
              <text x={x + groupW / 2} y={height + 14} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">
                {d.label?.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── HorizontalBarChart ────────────────────────────────────────────────────────

export function HorizontalBarChart({
  data = [],          // [{ label, value, color? }]
  maxValue = null,
  barHeight = 20,
  gap = 8,
  showValues = true,
  labelWidth = 120,
}) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-1 w-full">
      {data.map((d, i) => {
        const pct = Math.min((d.value / max) * 100, 100);
        return (
          <div key={i} className="flex items-center gap-2" style={{ marginBottom: gap }}>
            <span
              className="text-xs text-text-secondary truncate shrink-0 text-right"
              style={{ width: labelWidth, fontSize: 11 }}
              title={d.label}
            >
              {d.label}
            </span>
            <div className="flex-1 bg-border rounded-full overflow-hidden" style={{ height: barHeight }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, background: d.color || 'var(--color-primary)' }}
              />
            </div>
            {showValues && (
              <span className="text-xs font-medium text-text-secondary shrink-0 w-10 text-right">
                {d.value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
