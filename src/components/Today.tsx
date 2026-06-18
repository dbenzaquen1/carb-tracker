import { sumCarbs } from '../lib/carbs'
import { formatLong } from '../lib/dates'
import type { Entry, NewEntry } from '../types'
import { AddEntryForm } from './AddEntryForm'
import { EntryList } from './EntryList'
import { SummaryRing } from './SummaryRing'

interface Props {
  date: string
  goal: number
  entries: Entry[]
  onAdd: (entry: NewEntry) => void | Promise<void>
  onDelete: (id: string) => void
}

/** The main daily view: progress ring, add form, and today's entries. */
export function Today({ date, goal, entries, onAdd, onDelete }: Props) {
  const consumed = sumCarbs(entries)

  return (
    <div className="view today">
      <p className="today__date">{formatLong(date)}</p>
      <SummaryRing consumed={consumed} goal={goal} />
      <AddEntryForm date={date} onAdd={onAdd} />
      {entries.length === 0 ? (
        <p className="empty">
          No entries yet today. Add your first item above.
        </p>
      ) : (
        <EntryList entries={entries} onDelete={onDelete} />
      )}
    </div>
  )
}
