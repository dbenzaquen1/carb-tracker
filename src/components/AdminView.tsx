import { useState } from 'react'
import { sumCarbs, groupByMeal, mealTotals } from '../lib/carbs'
import { lastNDays, weekDates } from '../lib/dates'
import { countExercised } from '../lib/exercise'
import {
  averagePerLoggedDay,
  dailyTotals,
  daysWithinGoal,
  loggedDayCount,
} from '../lib/metrics'
import { filterUsers, type AdminUser } from '../lib/admin'
import { MEALS, MEAL_LABELS } from '../types'
import { BarChart } from './BarChart'
import { SummaryRing } from './SummaryRing'
import { Spinner } from './Spinner'
import { WeeklyCheckCard } from './WeeklyCheckCard'

interface Props {
  users: AdminUser[]
  today: string
  loading: boolean
  error: string | null
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

function AdminUserDetail({ user, today }: { user: AdminUser; today: string }) {
  const todays = user.entries.filter((e) => e.entry_date === today)
  const consumed = sumCarbs(todays)

  const daily7 = dailyTotals(user.entries, lastNDays(7, today))
  const daily14 = dailyTotals(user.entries, lastNDays(14, today))
  const daily30 = dailyTotals(user.entries, lastNDays(30, today))
  const avg7 = averagePerLoggedDay(daily7)
  const avg30 = averagePerLoggedDay(daily30)
  const within7 = daysWithinGoal(daily7, user.dailyGoal)
  const logged7 = loggedDayCount(daily7)

  const exToday = user.exercisedDates.has(today)
  const ptToday = user.ptDates.has(today)
  const skinCreamToday = user.skinCreamDates.has(today)

  const groups = groupByMeal(todays)
  const totals = mealTotals(todays)

  return (
    <div className="admin__detail">
      <p className="admin__meta">
        Daily goal {user.dailyGoal} g · Exercise {user.weeklyExerciseGoal}/wk ·
        PT {user.weeklyPtGoal}/wk
      </p>

      <SummaryRing consumed={consumed} goal={user.dailyGoal} />

      <div className="admin__flags">
        <span className={`admin__flag ${exToday ? 'is-done' : ''}`}>
          {exToday ? '✓' : '—'} Exercise today
        </span>
        <span className={`admin__flag ${ptToday ? 'is-done' : ''}`}>
          {ptToday ? '✓' : '—'} PT today
        </span>
        <span className={`admin__flag ${skinCreamToday ? 'is-done' : ''}`}>
          {skinCreamToday ? '✓' : '—'} Cream today
        </span>
      </div>

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
        <StatCard label="Goal" value={`${user.dailyGoal} g`} sub="daily" />
      </div>

      <section className="chart-card">
        <h3>Last 14 days</h3>
        <BarChart data={daily14} goal={user.dailyGoal} />
      </section>

      <WeeklyCheckCard
        title="Exercise"
        doneDates={user.exercisedDates}
        weeklyGoal={user.weeklyExerciseGoal}
        today={today}
      />
      <WeeklyCheckCard
        title="PT exercises"
        doneDates={user.ptDates}
        weeklyGoal={user.weeklyPtGoal}
        today={today}
      />
      <WeeklyCheckCard
        title="Skin cream"
        doneDates={user.skinCreamDates}
        weeklyGoal={user.weeklySkinCreamGoal}
        today={today}
      />

      <section className="chart-card">
        <h3>Today's entries</h3>
        {todays.length === 0 ? (
          <p className="empty">Nothing logged today.</p>
        ) : (
          MEALS.map((meal) =>
            groups[meal].length === 0 ? null : (
              <div className="admin__meal" key={meal}>
                <div className="admin__meal-head">
                  <strong>{MEAL_LABELS[meal]}</strong>
                  <span>{totals[meal]} g</span>
                </div>
                <ul className="admin__meal-items">
                  {groups[meal].map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.name}</span>
                      <span className="admin__entry-carbs">
                        {entry.carbs} g
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )
        )}
      </section>
    </div>
  )
}

/** Read-only admin dashboard: search a user, see how they're doing. */
export function AdminView({ users, today, loading, error }: Props) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = filterUsers(users, query)
  const week = weekDates(today)

  return (
    <div className="view admin">
      <h2 className="view__title">Users</h2>

      <input
        className="admin__search"
        type="search"
        placeholder="Search by email…"
        aria-label="Search users by email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="banner banner--error">{error}</p>}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <p className="empty">No users match.</p>
      ) : (
        <div className="admin__list">
          {filtered.map((user) => {
            const consumed = sumCarbs(
              user.entries.filter((e) => e.entry_date === today),
            )
            const ex = countExercised(week, user.exercisedDates)
            const pt = countExercised(week, user.ptDates)
            const cream = countExercised(week, user.skinCreamDates)
            const open = selectedId === user.id
            return (
              <div className="admin__row" key={user.id}>
                <button
                  className={`admin__user ${open ? 'is-open' : ''}`}
                  aria-expanded={open}
                  onClick={() => setSelectedId(open ? null : user.id)}
                >
                  <span className="admin__email">
                    {user.email ?? '(no email)'}
                    {user.isAdmin && (
                      <span className="admin__badge">admin</span>
                    )}
                  </span>
                  <span className="admin__summary">
                    {consumed}/{user.dailyGoal} g · 🏃 {ex}/
                    {user.weeklyExerciseGoal} · 🩹 {pt}/{user.weeklyPtGoal} · 🧴{' '}
                    {cream}/{user.weeklySkinCreamGoal}
                  </span>
                </button>
                {open && <AdminUserDetail user={user} today={today} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
