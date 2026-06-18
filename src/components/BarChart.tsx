import { weekdayLabel } from '../lib/dates'
import type { DayTotal } from '../lib/metrics'

interface Props {
  data: DayTotal[]
  goal: number
}

/** Lightweight, dependency-free SVG bar chart of daily carb totals. */
export function BarChart({ data, goal }: Props) {
  const chartHeight = 160
  const labelHeight = 22
  const barWidth = 22
  const barGap = 8
  const topPad = 8

  const width = data.length * (barWidth + barGap) + barGap
  const height = chartHeight + labelHeight
  const max = Math.max(goal, ...data.map((d) => d.total), 1)
  const scale = (value: number) => (value / max) * (chartHeight - topPad)
  const goalY = chartHeight - scale(goal)

  return (
    <svg
      className="barchart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Daily carbs over the period"
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
      {data.map((day, i) => {
        const barHeight = scale(day.total)
        const x = barGap + i * (barWidth + barGap)
        const y = chartHeight - barHeight
        const over = day.total > goal
        const empty = day.count === 0
        const className = [
          'barchart__bar',
          over ? 'is-over' : '',
          empty ? 'is-empty' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <g key={day.date}>
            <title>{`${day.date}: ${day.total} g`}</title>
            <rect
              className={className}
              x={x}
              y={empty ? chartHeight - 2 : y}
              width={barWidth}
              height={empty ? 2 : Math.max(barHeight, 2)}
              rx={3}
            />
            <text
              className="barchart__label"
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
            >
              {weekdayLabel(day.date).charAt(0)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
