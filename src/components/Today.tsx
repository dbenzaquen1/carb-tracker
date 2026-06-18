import { sumCarbs } from '../lib/carbs'
import { relativeDayLabel } from '../lib/dates'
import type { Entry, NewEntry } from '../types'
import { AddEntryForm } from './AddEntryForm'
import { EntryList } from './EntryList'
import { SummaryRing } from './SummaryRing'

interface Props {
  /** The day currently being viewed (YYYY-MM-DD). */
  date: string
  /** Today's date, used to label the day and cap forward navigation. */
  today: string
  goal: number
  entries: Entry[]
  onAdd: (entry: NewEntry) => void | Promise<void>
  onDelete: (id: string) => void
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
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
  onAdd,
  onDelete,
  onPrevDay,
  onNextDay,
  onToday,
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
      <AddEntryForm date={date} onAdd={onAdd} />

      {entries.length === 0 ? (
        <p className="empty">
          {isToday
            ? 'No entries yet today. Add your first item above.'
            : 'No entries logged for this day. You can add them above.'}
        </p>
      ) : (
        <EntryList entries={entries} onDelete={onDelete} />
      )}
    </div>
  )
}
