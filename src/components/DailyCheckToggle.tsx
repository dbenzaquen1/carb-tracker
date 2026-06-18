interface Props {
  done: boolean
  onToggle: () => void
  /** Button text when not yet done, e.g. "Mark exercise done". */
  idleLabel: string
  /** Button text when done, e.g. "Exercise done". */
  doneLabel: string
}

/** A big tappable daily check-off (reused for exercise and PT). */
export function DailyCheckToggle({
  done,
  onToggle,
  idleLabel,
  doneLabel,
}: Props) {
  return (
    <button
      type="button"
      className={`exercise-toggle ${done ? 'is-done' : ''}`}
      aria-pressed={done}
      onClick={onToggle}
    >
      <span className="exercise-toggle__box" aria-hidden="true">
        {done ? '✓' : ''}
      </span>
      <span className="exercise-toggle__label">
        {done ? doneLabel : idleLabel}
      </span>
    </button>
  )
}
