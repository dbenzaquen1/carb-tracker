import { formatShort, lastNDays } from '../lib/dates'
import {
  averagePerLoggedDay,
  dailyTotals,
  daysWithinGoal,
  highestDay,
  loggedDayCount,
} from '../lib/metrics'
import { bucketModeFor, chartBars } from '../lib/chart'
import type { Entry } from '../types'
import { TrendChart } from './TrendChart'
import { WeeklyCheckCard } from './WeeklyCheckCard'

export interface WeeklyCheck {
  key: string
  title: string
  doneDates: Set<string>
  goal: number
}

const HISTORY_PERIODS: { days: number; label: string }[] = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
]

interface Props {
  entries: Entry[]
  goal: number
  today: string
  weeklyChecks: WeeklyCheck[]
  /** How far back the carb stats summarize. */
  periodDays: number
  onChangePeriod: (days: number) => void
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

/** Trends view: carb averages over a selectable period, a recent chart, and
 * weekly check-off cards. */
export function Metrics({
  entries,
  goal,
  today,
  weeklyChecks,
  periodDays,
  onChangePeriod,
}: Props) {
  const periodLabel =
    HISTORY_PERIODS.find((p) => p.days === periodDays)?.label ??
    `${periodDays} days`

  const period = dailyTotals(entries, lastNDays(periodDays, today))
  const bars = chartBars(entries, periodDays, today)
  const mode = bucketModeFor(periodDays)
  const chartHeading =
    mode === 'day'
      ? `Daily (${periodLabel})`
      : mode === 'week'
        ? `Weekly avg/day (${periodLabel})`
        : `Monthly avg/day (${periodLabel})`

  const avg = averagePerLoggedDay(period)
  const within = daysWithinGoal(period, goal)
  const logged = loggedDayCount(period)
  const peak = highestDay(period)

  return (
    <div className="view metrics">
      <h2 className="view__title">Your trends</h2>

      <div className="period-picker" role="group" aria-label="History period">
        {HISTORY_PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            className={`period-picker__btn ${
              periodDays === p.days ? 'is-active' : ''
            }`}
            aria-pressed={periodDays === p.days}
            onClick={() => onChangePeriod(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="stats">
        <StatCard label="Avg / day" value={`${avg} g`} sub="per logged day" />
        <StatCard
          label="On target"
          value={`${within}/${logged}`}
          sub="logged days"
        />
        <StatCard
          label="Logged"
          value={`${logged}`}
          sub={`in ${periodLabel}`}
        />
        <StatCard label="Goal" value={`${goal} g`} sub="daily target" />
      </div>

      <section className="chart-card">
        <h3>{chartHeading}</h3>
        <TrendChart bars={bars} goal={goal} />
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
          Highest day in the last {periodLabel}: <strong>{peak.total} g</strong>{' '}
          on {formatShort(peak.date)}.
        </p>
      ) : (
        <p className="empty">
          No data yet for this period. Log some days and your trends appear
          here.
        </p>
      )}
    </div>
  )
}
