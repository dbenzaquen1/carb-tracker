import { useState, type FormEvent } from 'react'
import { formatShort, relativeDayLabel } from '../lib/dates'
import {
  WORKOUT_TEMPLATES,
  formatSetSummary,
  getTemplate,
  groupSetsByExercise,
  inferTemplateId,
  lastSession,
  type TemplateExercise,
} from '../lib/workouts'
import type { NewWorkoutSet, WorkoutSet } from '../types'

interface Props {
  /** The day currently being viewed (YYYY-MM-DD). */
  date: string
  /** Today's date, used to label the day and cap forward navigation. */
  today: string
  /** Full workout history (all days), used for "last time" hints. */
  sets: WorkoutSet[]
  onAdd: (set: NewWorkoutSet) => void | Promise<void>
  onDelete: (id: string) => void
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  /** Jump straight to any date (YYYY-MM-DD). */
  onPickDate: (date: string) => void
}

/**
 * The gym log: pick which day of the split you're doing, then record
 * weight × reps for each set. Each exercise shows its target volume and what
 * you lifted last time so progression is easy to eyeball.
 */
export function Workouts({
  date,
  today,
  sets,
  onAdd,
  onDelete,
  onPrevDay,
  onNextDay,
  onToday,
  onPickDate,
}: Props) {
  const isToday = date === today

  // Template choice per viewed date: an explicit tap wins, otherwise inferred
  // from whatever is already logged that day.
  const [picked, setPicked] = useState<Record<string, string>>({})
  // Extra (off-plan) exercises the user added while viewing a date.
  const [extras, setExtras] = useState<Record<string, string[]>>({})
  const [newExercise, setNewExercise] = useState('')

  const daySets = sets.filter((s) => s.entry_date === date)
  const logged = groupSetsByExercise(daySets)
  const templateId =
    picked[date] ?? inferTemplateId(logged.map((g) => g.exercise))
  const template = templateId ? getTemplate(templateId) : undefined

  const plannedNames = new Set(template?.exercises.map((e) => e.name) ?? [])
  const extraNames = [
    ...logged.map((g) => g.exercise).filter((name) => !plannedNames.has(name)),
    ...(extras[date] ?? []).filter(
      (name) =>
        !plannedNames.has(name) && !logged.some((g) => g.exercise === name),
    ),
  ]

  function addExtra(event: FormEvent) {
    event.preventDefault()
    const name = newExercise.trim()
    if (!name) return
    setExtras((prev) => ({ ...prev, [date]: [...(prev[date] ?? []), name] }))
    setNewExercise('')
  }

  return (
    <div className="view workouts">
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

      <div className="template-picker" role="group" aria-label="Gym day">
        {WORKOUT_TEMPLATES.map((t) => (
          <button
            key={t.id}
            className={`template-picker__btn ${
              t.id === templateId ? 'is-active' : ''
            }`}
            aria-pressed={t.id === templateId}
            onClick={() => setPicked((prev) => ({ ...prev, [date]: t.id }))}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!template && extraNames.length === 0 && (
        <p className="empty">
          Pick a gym day above to see its exercises, then log each set as you
          go.
        </p>
      )}

      {template?.exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.name}
          date={date}
          exercise={exercise}
          daySets={logged.find((g) => g.exercise === exercise.name)?.sets ?? []}
          last={lastSession(sets, exercise.name, date)}
          onAdd={onAdd}
          onDelete={onDelete}
        />
      ))}

      {extraNames.map((name) => (
        <ExerciseCard
          key={name}
          date={date}
          exercise={{ name, sets: 0, reps: '' }}
          daySets={logged.find((g) => g.exercise === name)?.sets ?? []}
          last={lastSession(sets, name, date)}
          onAdd={onAdd}
          onDelete={onDelete}
        />
      ))}

      {(template || extraNames.length > 0) && (
        <form className="add-exercise" onSubmit={addExtra}>
          <input
            type="text"
            aria-label="Extra exercise name"
            placeholder="Add another exercise…"
            value={newExercise}
            maxLength={100}
            onChange={(e) => setNewExercise(e.target.value)}
          />
          <button
            className="btn"
            type="submit"
            disabled={newExercise.trim().length === 0}
          >
            Add
          </button>
        </form>
      )}
    </div>
  )
}

interface CardProps {
  date: string
  exercise: TemplateExercise
  /** Sets already logged for this exercise on the viewed day, in order. */
  daySets: WorkoutSet[]
  /** Most recent prior session of this exercise, for the hint line. */
  last: { date: string; sets: WorkoutSet[] } | null
  onAdd: (set: NewWorkoutSet) => void | Promise<void>
  onDelete: (id: string) => void
}

function ExerciseCard({
  date,
  exercise,
  daySets,
  last,
  onAdd,
  onDelete,
}: CardProps) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [busy, setBusy] = useState(false)

  const weightValue = weight.trim() === '' ? 0 : Number(weight)
  const repsValue = Number(reps)
  const isValid =
    reps.trim() !== '' &&
    Number.isInteger(repsValue) &&
    repsValue >= 1 &&
    Number.isFinite(weightValue) &&
    weightValue >= 0

  const hasTarget = exercise.sets > 0
  const isDone = hasTarget && daySets.length >= exercise.sets

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValid || busy) return
    setBusy(true)
    await onAdd({
      entry_date: date,
      exercise: exercise.name,
      weight: weightValue,
      reps: repsValue,
    })
    // Keep the weight — the next set is usually the same load.
    setReps('')
    setBusy(false)
  }

  return (
    <section className={`exercise ${isDone ? 'is-done' : ''}`}>
      <div className="exercise__head">
        <h3>{exercise.name}</h3>
        {hasTarget && (
          <span className="exercise__target">
            {exercise.sets} × {exercise.reps}
          </span>
        )}
      </div>

      {last && (
        <p className="exercise__last">
          Last: {formatShort(last.date)} · {formatSetSummary(last.sets)}
        </p>
      )}

      {daySets.length > 0 && (
        <ol className="exercise__sets">
          {daySets.map((set) => (
            <li key={set.id} className="exercise__set">
              <span className="exercise__set-summary">
                {formatSetSummary([set])}
              </span>
              <button
                className="exercise__set-delete"
                aria-label={`Delete ${exercise.name} set`}
                onClick={() => onDelete(set.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      <form className="exercise__form" onSubmit={handleSubmit}>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          aria-label={`${exercise.name} weight`}
          placeholder="Weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          aria-label={`${exercise.name} reps`}
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
        <button
          className="btn btn--primary"
          type="submit"
          disabled={!isValid || busy}
        >
          Log set
        </button>
      </form>
    </section>
  )
}
