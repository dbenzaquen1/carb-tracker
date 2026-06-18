import { groupByMeal, mealTotals } from '../lib/carbs'
import { MEALS, MEAL_LABELS, type Entry } from '../types'
import { EntryRow } from './EntryRow'

interface Props {
  entries: Entry[]
  onUpdate: (
    id: string,
    patch: Partial<Pick<Entry, 'name' | 'carbs' | 'meal'>>,
  ) => void | Promise<void>
  onDelete: (id: string) => void
}

/** Today's entries grouped by meal, each with a per-meal subtotal. */
export function EntryList({ entries, onUpdate, onDelete }: Props) {
  const groups = groupByMeal(entries)
  const totals = mealTotals(entries)

  return (
    <div className="entry-list">
      {MEALS.map((meal) => {
        const items = groups[meal]
        if (items.length === 0) return null
        return (
          <section className="meal" key={meal}>
            <header className="meal__header">
              <h3>{MEAL_LABELS[meal]}</h3>
              <span className="meal__total">{totals[meal]} g</span>
            </header>
            <ul className="meal__items">
              {items.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
