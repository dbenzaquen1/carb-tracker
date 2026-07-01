import type { ChartBar } from '../lib/chart'

interface Props {
  bars: ChartBar[]
  goal: number
}

/**
 * Dependency-free SVG bar chart. The per-bar slot width adapts to the number of
 * bars so a long range (many bars) stays about the same on-screen size and
 * labels remain legible.
 */
export function TrendChart({ bars, goal }: Props) {
  const chartHeight = 160
  const labelHeight = 22
  const topPad = 8

  const count = Math.max(bars.length, 1)
  const slot = Math.max(12, Math.round(340 / count))
  const barWidth = Math.max(4, Math.round(slot * 0.68))
  const width = count * slot
  const height = chartHeight + labelHeight
  const max = Math.max(goal, ...bars.map((b) => b.value), 1)
  const scale = (value: number) => (value / max) * (chartHeight - topPad)
  const goalY = chartHeight - scale(goal)

  return (
    <svg
      className="barchart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Carbs over the selected period"
      preserveAspectRatio="xMidYMid meet"
    >
      {goal > 0 && (
        <line
          className="barchart__goal"
          x1={0}
          x2={width}
          y1={goalY}
          y2={goalY}
        />
      )}
      {bars.map((bar, i) => {
        const barHeight = scale(bar.value)
        const x = i * slot + (slot - barWidth) / 2
        const y = chartHeight - barHeight
        const over = bar.value > goal
        const className = [
          'barchart__bar',
          over ? 'is-over' : '',
          bar.empty ? 'is-empty' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <g key={bar.key}>
            <title>{bar.tooltip}</title>
            <rect
              className={className}
              x={x}
              y={bar.empty ? chartHeight - 2 : y}
              width={barWidth}
              height={bar.empty ? 2 : Math.max(barHeight, 2)}
              rx={3}
            />
            {bar.label && (
              <text
                className="barchart__label"
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
              >
                {bar.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
