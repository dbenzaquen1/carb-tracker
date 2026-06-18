import { useState } from 'react'
import { MEALS, MEAL_LABELS, type Entry, type Meal } from '../types'

interface Props {
  entry: Entry
  onUpdate: (
    id: string,
    patch: Partial<Pick<Entry, 'name' | 'carbs' | 'meal'>>,
  ) => void | Promise<void>
  onDelete: (id: string) => void
}

/** A single logged entry: read-only by default, with an inline edit mode. */
export function EntryRow({ entry, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.name)
  const [carbs, setCarbs] = useState(String(entry.carbs))
  const [meal, setMeal] = useState<Meal>(entry.meal)
  const [busy, setBusy] = useState(false)

  const carbsValue = Number(carbs)
  const isValid =
    name.trim().length > 0 &&
    carbs.trim() !== '' &&
    Number.isFinite(carbsValue) &&
    carbsValue >= 0

  function startEditing() {
    // Reset the draft to the current values each time we open the editor.
    setName(entry.name)
    setCarbs(String(entry.carbs))
    setMeal(entry.meal)
    setEditing(true)
  }

  async function save() {
    if (!isValid || busy) return
    setBusy(true)
    await onUpdate(entry.id, { name: name.trim(), carbs: carbsValue, meal })
    setBusy(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="entry entry--editing">
        <div className="entry-edit">
          <input
            className="entry-edit__name"
            type="text"
            aria-label="Edit food name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="entry-edit__row">
            <input
              className="entry-edit__carbs"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              aria-label="Edit carbs in grams"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
            <select
              className="entry-edit__meal"
              aria-label="Edit meal"
              value={meal}
              onChange={(e) => setMeal(e.target.value as Meal)}
            >
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="entry-edit__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={save}
              disabled={!isValid || busy}
            >
              Save
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className="entry">
      <span className="entry__name">{entry.name}</span>
      <span className="entry__carbs">{entry.carbs} g</span>
      <button
        className="entry__edit"
        aria-label={`Edit ${entry.name}`}
        onClick={startEditing}
      >
        ✎
      </button>
      <button
        className="entry__delete"
        aria-label={`Delete ${entry.name}`}
        onClick={() => onDelete(entry.id)}
      >
        ✕
      </button>
    </li>
  )
}
