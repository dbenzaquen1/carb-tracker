import { useState, type FormEvent } from 'react'
import { MEALS, MEAL_LABELS, type Meal, type NewEntry } from '../types'
import { suggestedMeal } from '../lib/meals'
import { filterPastFoods, type PastFood } from '../lib/suggestions'

interface Props {
  date: string
  onAdd: (entry: NewEntry) => void | Promise<void>
  /** Previously logged foods, newest first, for the autocomplete dropdown. */
  pastFoods?: PastFood[]
}

/**
 * Form for logging a food item: name, carbs (g), and meal. Typing (or focusing)
 * the name field shows a dropdown of previously logged foods; picking one fills
 * in its carbs, which stay editable.
 */
export function AddEntryForm({ date, onAdd, pastFoods = [] }: Props) {
  const [name, setName] = useState('')
  const [carbs, setCarbs] = useState('')
  const [meal, setMeal] = useState<Meal>(() => suggestedMeal())
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)

  const carbsValue = Number(carbs)
  const isValid =
    name.trim().length > 0 &&
    carbs.trim() !== '' &&
    Number.isFinite(carbsValue) &&
    carbsValue >= 0

  const suggestions = focused ? filterPastFoods(pastFoods, name) : []

  function selectFood(food: PastFood) {
    setName(food.name)
    setCarbs(String(food.carbs))
    setFocused(false)
  }

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
        <div className="combobox">
          <input
            className="add-form__name"
            type="text"
            aria-label="Food name"
            placeholder="e.g. Banana"
            value={name}
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="past-food-suggestions"
            onChange={(e) => {
              setName(e.target.value)
              setFocused(true)
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          />
          {suggestions.length > 0 && (
            <ul
              className="combobox__list"
              id="past-food-suggestions"
              role="listbox"
              aria-label="Recent foods"
            >
              {suggestions.map((food) => (
                <li key={food.name}>
                  <button
                    type="button"
                    className="combobox__option"
                    role="option"
                    aria-selected="false"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      selectFood(food)
                    }}
                  >
                    <span className="combobox__name">{food.name}</span>
                    <span className="combobox__carbs">{food.carbs} g</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
