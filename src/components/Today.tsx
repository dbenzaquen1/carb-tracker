import { sumCarbs } from '../lib/carbs'
import { relativeDayLabel } from '../lib/dates'
import type { PastFood } from '../lib/suggestions'
import type { Entry, NewEntry } from '../types'
import { AddEntryForm } from './AddEntryForm'
import { DailyCheckToggle } from './DailyCheckToggle'
import { EntryList } from './EntryList'
import { SummaryRing } from './SummaryRing'

export interface DayCheck {
  key: string
  done: boolean
  onToggle: () => void
  idleLabel: string
  doneLabel: string
}

interface Props {
  /** The day currently being viewed (YYYY-MM-DD). */
  date: string
  /** Today's date, used to label the day and cap forward navigation. */
  today: string
  goal: number
  entries: Entry[]
  pastFoods: PastFood[]
  onAdd: (entry: NewEntry) => void | Promise<void>
  onUpdate: (
    id: string,
    patch: Partial<Pick<Entry, 'name' | 'carbs' | 'meal'>>,
  ) => void | Promise<void>
  onDelete: (id: string) => void
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  /** Jump straight to any date (YYYY-MM-DD). */
  onPickDate: (date: string) => void
  /** Daily check-offs (exercise, PT, …) for the selected day. */
  checks: DayCheck[]
}

/**
 * The main daily view: a date navigator plus the progress ring, add form, and
 * that day's entries. Defaults to today but can browse back through prior days.
 */
export function Today({
  date,
  today,
  goal,
  entries,
  pastFoods,
  onAdd,
  onUpdate,
  onDelete,
  onPrevDay,
  onNextDay,
  onToday,
  onPickDate,
  checks,
}: Props) {
  const consumed = sumCarbs(entries)
  const isToday = date === today

  return (
    <div className="view today">
      <div className="day-nav">
        <button
          className="day-nav__arrow"
          aria-label="Previous day"
          onClick={onPrevDay}
        >
          ‹
        </button>
        <div className="day-nav__center">
          <span className="day-nav__label">
            {relativeDayLabel(date, today)}
          </span>
          <input
            type="date"
            className="day-nav__date"
            aria-label="Jump to date"
            value={date}
            max={today}
            onChange={(e) => {
              if (e.target.value) onPickDate(e.target.value)
            }}
          />
          {!isToday && (
            <button className="day-nav__today" onClick={onToday}>
              Jump to today
            </button>
          )}
        </div>
        <button
          className="day-nav__arrow"
          aria-label="Next day"
          onClick={onNextDay}
          disabled={isToday}
        >
          ›
        </button>
      </div>

      <SummaryRing consumed={consumed} goal={goal} />

      {checks.length > 0 && (
        <div className="day-checks">
          {checks.map((check) => (
            <DailyCheckToggle
              key={check.key}
              done={check.done}
              onToggle={check.onToggle}
              idleLabel={check.idleLabel}
              doneLabel={check.doneLabel}
            />
          ))}
        </div>
      )}

      <AddEntryForm date={date} onAdd={onAdd} pastFoods={pastFoods} />

      {entries.length === 0 ? (
        <p className="empty">
          {isToday
            ? 'No entries yet today. Add your first item above.'
            : 'No entries logged for this day. You can add them above.'}
        </p>
      ) : (
        <EntryList entries={entries} onUpdate={onUpdate} onDelete={onDelete} />
      )}
    </div>
  )
}
