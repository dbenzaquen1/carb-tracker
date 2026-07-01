import { weekdayLabel } from '../lib/dates'
import type { ChartBar } from '../lib/chart'
import type { DayTotal } from '../lib/metrics'
import { TrendChart } from './TrendChart'

interface Props {
  data: DayTotal[]
  goal: number
}

/**
 * Daily bar chart (one bar per day, weekday-initial labels). Thin adapter over
 * TrendChart so both charts share one renderer.
 */
export function BarChart({ data, goal }: Props) {
  const bars: ChartBar[] = data.map((day) => ({
    key: day.date,
    label: weekdayLabel(day.date).charAt(0),
    value: day.total,
    empty: day.count === 0,
    tooltip: `${day.date}: ${day.total} g`,
  }))
  return <TrendChart bars={bars} goal={goal} />
}
