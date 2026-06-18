import { useState, type FormEvent } from 'react'
import { MEALS, MEAL_LABELS, type Meal, type NewEntry } from '../types'
import { suggestedMeal } from '../lib/meals'

interface Props {
  date: string
  onAdd: (entry: NewEntry) => void | Promise<void>
}

/** Form for logging a food item: name, carbs (g), and meal. */
export function AddEntryForm({ date, onAdd }: Props) {
  const [name, setName] = useState('')
  const [carbs, setCarbs] = useState('')
  const [meal, setMeal] = useState<Meal>(() => suggestedMeal())
  const [busy, setBusy] = useState(false)

  const carbsValue = Number(carbs)
  const isValid =
    name.trim().length > 0 &&
    carbs.trim() !== '' &&
    Number.isFinite(carbsValue) &&
    carbsValue >= 0

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValid || busy) return
    setBusy(true)
    await onAdd({
      entry_date: date,
      meal,
      name: name.trim(),
      carbs: carbsValue,
    })
    setName('')
    setCarbs('')
    setBusy(false)
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <div className="meal-picker" role="group" aria-label="Meal">
        {MEALS.map((m) => (
          <button
            type="button"
            key={m}
            className={`meal-picker__btn ${meal === m ? 'is-active' : ''}`}
            aria-pressed={meal === m}
            onClick={() => setMeal(m)}
          >
            {MEAL_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="add-form__row">
        <input
          className="add-form__name"
          type="text"
          aria-label="Food name"
          placeholder="e.g. Banana"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="add-form__carbs"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          aria-label="Carbs in grams"
          placeholder="Carbs (g)"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
        />
        <button
          className="btn btn--primary add-form__submit"
          type="submit"
          disabled={!isValid || busy}
        >
          Add
        </button>
      </div>
    </form>
  )
}
