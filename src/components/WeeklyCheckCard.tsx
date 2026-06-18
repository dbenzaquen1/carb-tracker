import { lastNDays, weekDates, weekdayLabel } from '../lib/dates'
import { countExercised, weeklyAverage } from '../lib/exercise'

interface Props {
  title: string
  /** Dates marked done. */
  doneDates: Set<string>
  /** Target number of days per (calendar) week. */
  weeklyGoal: number
  today: string
}

/**
 * Trends card for a weekly day-count goal (exercise, PT, …): this week's
 * progress (Sunday–Saturday), a 7-day dot row, and the 30-day weekly average.
 */
export function WeeklyCheckCard({
  title,
  doneDates,
  weeklyGoal,
  today,
}: Props) {
  const weekDays = weekDates(today)
  const thisWeek = countExercised(weekDays, doneDates)
  const avg = weeklyAverage(lastNDays(30, today), doneDates)
  const met = thisWeek >= weeklyGoal
  const pct = Math.min(100, Math.round((thisWeek / weeklyGoal) * 100))

  return (
    <section className="chart-card exercise-card">
      <div className="exercise-card__head">
        <h3>{title}</h3>
        <span className={`exercise-card__count ${met ? 'is-met' : ''}`}>
          {thisWeek} / {weeklyGoal} this week
        </span>
      </div>
      <div className="progress">
        <div
          className={`progress__bar ${met ? 'is-met' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className="exercise-week"
        aria-label={`This week's ${title} (Sunday to Saturday)`}
      >
        {weekDays.map((date) => {
          const done = doneDates.has(date)
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
        {met
          ? '🎉 Weekly goal met!'
          : `${Math.max(0, weeklyGoal - thisWeek)} to go this week`}{' '}
        · {avg}/week over 30 days
      </p>
    </section>
  )
}
