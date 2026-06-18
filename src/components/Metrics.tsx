import { formatShort, lastNDays, weekDates, weekdayLabel } from '../lib/dates'
import {
  averagePerLoggedDay,
  dailyTotals,
  daysWithinGoal,
  highestDay,
  loggedDayCount,
} from '../lib/metrics'
import { countExercised, weeklyAverage } from '../lib/exercise'
import type { Entry } from '../types'
import { BarChart } from './BarChart'

interface Props {
  entries: Entry[]
  goal: number
  today: string
  exercisedDates: Set<string>
  weeklyExerciseGoal: number
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

/** Trends view: averages, on-target days, and a 14-day chart. */
export function Metrics({
  entries,
  goal,
  today,
  exercisedDates,
  weeklyExerciseGoal,
}: Props) {
  const last7 = lastNDays(7, today)
  const daily7 = dailyTotals(entries, last7)
  const daily14 = dailyTotals(entries, lastNDays(14, today))
  const daily30 = dailyTotals(entries, lastNDays(30, today))

  const avg7 = averagePerLoggedDay(daily7)
  const avg30 = averagePerLoggedDay(daily30)
  const within7 = daysWithinGoal(daily7, goal)
  const logged7 = loggedDayCount(daily7)
  const peak = highestDay(daily30)

  // Exercise "this week" follows the calendar week (Sunday–Saturday).
  const weekDays = weekDates(today)
  const exercisedThisWeek = countExercised(weekDays, exercisedDates)
  const exerciseWeeklyAvg = weeklyAverage(lastNDays(30, today), exercisedDates)
  const metExerciseGoal = exercisedThisWeek >= weeklyExerciseGoal
  const exercisePct = Math.min(
    100,
    Math.round((exercisedThisWeek / weeklyExerciseGoal) * 100),
  )

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

      <section className="chart-card exercise-card">
        <div className="exercise-card__head">
          <h3>Exercise</h3>
          <span
            className={`exercise-card__count ${metExerciseGoal ? 'is-met' : ''}`}
          >
            {exercisedThisWeek} / {weeklyExerciseGoal} this week
          </span>
        </div>
        <div className="progress">
          <div
            className={`progress__bar ${metExerciseGoal ? 'is-met' : ''}`}
            style={{ width: `${exercisePct}%` }}
          />
        </div>
        <div
          className="exercise-week"
          aria-label="This week's exercise (Sunday to Saturday)"
        >
          {weekDays.map((date) => {
            const done = exercisedDates.has(date)
            const isFuture = date > today
            const isToday = date === today
            return (
              <div
                className={`exercise-week__day ${isFuture ? 'is-future' : ''}`}
                key={date}
              >
                <span
                  className={`exercise-week__dot ${done ? 'is-done' : ''} ${
                    isToday ? 'is-today' : ''
                  }`}
                  aria-hidden="true"
                >
                  {done ? '✓' : ''}
                </span>
                <span className="exercise-week__label">
                  {weekdayLabel(date).charAt(0)}
                </span>
              </div>
            )
          })}
        </div>
        <p className="metrics__note">
          {metExerciseGoal
            ? '🎉 Weekly goal met!'
            : `${Math.max(0, weeklyExerciseGoal - exercisedThisWeek)} to go this week`}{' '}
          · {exerciseWeeklyAvg}/week over 30 days
        </p>
      </section>

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
