import { fmt } from '@/engine/cgpa'

// A hand-rolled SVG sparkline of GPA per semester — no chart library. The y-axis
// is pinned to the real 0–4 grade range (not autoscaled), so the slope reads as
// genuine movement. Colour never carries meaning alone: every point shows its
// value and its semester number, and the whole series is read out via aria-label.
//
// points: [{ label: string, gpa: number }] in chronological order.
export function Trend({ points }) {
  const W = 640
  const H = 240
  const padL = 22
  const padR = 16
  const padT = 20
  const padB = 36
  const MAXY = 4
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const baseline = padT + innerH

  const n = points.length
  const x = (i) => (n === 1 ? padL + innerW / 2 : padL + (i * innerW) / (n - 1))
  const y = (g) => padT + (1 - Math.min(MAXY, Math.max(0, g)) / MAXY) * innerH

  const linePts = points.map((p, i) => `${x(i)},${y(p.gpa)}`).join(' ')
  const areaPts = `${x(0)},${baseline} ${linePts} ${x(n - 1)},${baseline}`

  const summary = points.map((p) => `${p.label} ${fmt(p.gpa)}`).join(', ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`GPA by semester, left to right: ${summary}.`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid + y-scale — quiet, muted, decorative */}
      <g className="text-muted" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((v) => (
          <line
            key={v}
            x1={padL}
            y1={y(v)}
            x2={padL + innerW}
            y2={y(v)}
            stroke="currentColor"
            strokeOpacity={v === 0 ? 0.35 : 0.14}
            strokeWidth={1}
          />
        ))}
        <text x={2} y={y(4) + 4} fill="currentColor" className="font-mono" fontSize={11} opacity={0.7}>
          4.0
        </text>
        <text x={2} y={y(0) + 4} fill="currentColor" className="font-mono" fontSize={11} opacity={0.7}>
          0.0
        </text>
      </g>

      {/* Series — the single accent */}
      <g className="text-neonCyan">
        <polygon points={areaPts} fill="currentColor" fillOpacity={0.1} />
        <polyline
          points={linePts}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.gpa)} r={3.5} fill="currentColor" />
        ))}
      </g>

      {/* Value labels above each point */}
      <g className="text-ink" fill="currentColor" textAnchor="middle">
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={y(p.gpa) - 10} className="font-mono tabular-nums" fontSize={12}>
            {fmt(p.gpa)}
          </text>
        ))}
      </g>

      {/* Semester numbers below the axis */}
      <g className="text-muted" fill="currentColor" textAnchor="middle">
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={baseline + 22} className="font-mono" fontSize={11}>
            {p.label}
          </text>
        ))}
      </g>
    </svg>
  )
}
