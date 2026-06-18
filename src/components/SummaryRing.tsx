import { isOverGoal, progressPercent, remaining } from '../lib/carbs'

interface Props {
  consumed: number
  goal: number
}

/** Circular progress ring showing carbs consumed vs. the daily goal. */
export function SummaryRing({ consumed, goal }: Props) {
  const pct = progressPercent(consumed, goal)
  const left = remaining(goal, consumed)
  const over = isOverGoal(consumed, goal)

  const size = 220
  const stroke = 18
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const center = size / 2

  return (
    <div className={`ring ${over ? 'ring--over' : ''}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${consumed} of ${goal} grams of carbs consumed`}
      >
        <circle
          className="ring__track"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="ring__value"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="ring__center">
        <span className="ring__consumed">{consumed}</span>
        <span className="ring__unit">of {goal} g</span>
        <span className={`ring__remaining ${over ? 'is-over' : ''}`}>
          {over ? `${Math.abs(left)} g over` : `${left} g left`}
        </span>
      </div>
    </div>
  )
}
