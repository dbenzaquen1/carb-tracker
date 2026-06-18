import { formatShort, lastNDays } from '../lib/dates'
import {
  averagePerLoggedDay,
  dailyTotals,
  daysWithinGoal,
  highestDay,
  loggedDayCount,
} from '../lib/metrics'
import type { Entry } from '../types'
import { BarChart } from './BarChart'
import { WeeklyCheckCard } from './WeeklyCheckCard'

export interface WeeklyCheck {
  key: string
  title: string
  doneDates: Set<string>
  goal: number
}

interface Props {
  entries: Entry[]
  goal: number
  today: string
  weeklyChecks: WeeklyCheck[]
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      <span className="stat__sub">{sub}</span>
    </div>
  )
}

/** Trends view: carb averages, a 14-day chart, and weekly check-off cards. */
export function Metrics({ entries, goal, today, weeklyChecks }: Props) {
  const daily7 = dailyTotals(entries, lastNDays(7, today))
  const daily14 = dailyTotals(entries, lastNDays(14, today))
  const daily30 = dailyTotals(entries, lastNDays(30, today))

  const avg7 = averagePerLoggedDay(daily7)
  const avg30 = averagePerLoggedDay(daily30)
  const within7 = daysWithinGoal(daily7, goal)
  const logged7 = loggedDayCount(daily7)
  const peak = highestDay(daily30)

  return (
    <div className="view metrics">
      <h2 className="view__title">Your trends</h2>

      <div className="stats">
        <StatCard label="7-day avg" value={`${avg7} g`} sub="per logged day" />
        <StatCard
          label="30-day avg"
          value={`${avg30} g`}
          sub="per logged day"
        />
        <StatCard
          label="On target"
          value={`${within7}/${logged7}`}
          sub="last 7 logged"
        />
        <StatCard label="Goal" value={`${goal} g`} sub="daily target" />
      </div>

      <section className="chart-card">
        <h3>Last 14 days</h3>
        <BarChart data={daily14} goal={goal} />
        <p className="chart-legend">
          <span className="dot dot--ok" /> within goal
          <span className="dot dot--over" /> over goal
          <span className="legend-line" /> goal
        </p>
      </section>

      {weeklyChecks.map((check) => (
        <WeeklyCheckCard
          key={check.key}
          title={check.title}
          doneDates={check.doneDates}
          weeklyGoal={check.goal}
          today={today}
        />
      ))}

      {peak ? (
        <p className="metrics__note">
          Highest day in the last 30: <strong>{peak.total} g</strong> on{' '}
          {formatShort(peak.date)}.
        </p>
      ) : (
        <p className="empty">
          No data yet. Log a few days and your trends will appear here.
        </p>
      )}
    </div>
  )
}
