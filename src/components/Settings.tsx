import { useEffect, useState } from 'react'
import { todayISO } from '../lib/dates'
import type { Entry } from '../types'

interface Props {
  goal: number
  weeklyExerciseGoal: number
  weeklyPtGoal: number
  email: string
  entries: Entry[]
  onSaveGoal: (goal: number) => void | Promise<void>
  onSaveWeeklyExerciseGoal: (goal: number) => void | Promise<void>
  onSaveWeeklyPtGoal: (goal: number) => void | Promise<void>
  onSignOut: () => void | Promise<void>
}

export function Settings({
  goal,
  weeklyExerciseGoal,
  weeklyPtGoal,
  email,
  entries,
  onSaveGoal,
  onSaveWeeklyExerciseGoal,
  onSaveWeeklyPtGoal,
  onSignOut,
}: Props) {
  const [value, setValue] = useState(String(goal))
  const [saved, setSaved] = useState(false)
  const [exerciseValue, setExerciseValue] = useState(String(weeklyExerciseGoal))
  const [exerciseSaved, setExerciseSaved] = useState(false)
  const [ptValue, setPtValue] = useState(String(weeklyPtGoal))
  const [ptSaved, setPtSaved] = useState(false)

  useEffect(() => {
    setValue(String(goal))
  }, [goal])

  useEffect(() => {
    setExerciseValue(String(weeklyExerciseGoal))
  }, [weeklyExerciseGoal])

  useEffect(() => {
    setPtValue(String(weeklyPtGoal))
  }, [weeklyPtGoal])

  const parsed = Number(value)
  const isValid = Number.isFinite(parsed) && parsed > 0

  const exerciseParsed = Number(exerciseValue)
  const isExerciseValid =
    Number.isFinite(exerciseParsed) && exerciseParsed > 0 && exerciseParsed <= 7

  const ptParsed = Number(ptValue)
  const isPtValid = Number.isFinite(ptParsed) && ptParsed > 0 && ptParsed <= 7

  async function handleSave() {
    if (!isValid) return
    await onSaveGoal(Math.round(parsed))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function handleSaveExercise() {
    if (!isExerciseValid) return
    await onSaveWeeklyExerciseGoal(Math.round(exerciseParsed))
    setExerciseSaved(true)
    setTimeout(() => setExerciseSaved(false), 1500)
  }

  async function handleSavePt() {
    if (!isPtValid) return
    await onSaveWeeklyPtGoal(Math.round(ptParsed))
    setPtSaved(true)
    setTimeout(() => setPtSaved(false), 1500)
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `carb-tracker-export-${todayISO()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="view settings">
      <h2 className="view__title">Settings</h2>

      <section className="settings__section">
        <label className="field">
          <span>Daily carb goal (g)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <button
          className="btn btn--primary"
          onClick={handleSave}
          disabled={!isValid}
        >
          {saved ? 'Saved ✓' : 'Save goal'}
        </button>
      </section>

      <section className="settings__section">
        <label className="field">
          <span>Weekly exercise goal (days)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="7"
            value={exerciseValue}
            onChange={(e) => setExerciseValue(e.target.value)}
          />
        </label>
        <button
          className="btn btn--primary"
          onClick={handleSaveExercise}
          disabled={!isExerciseValid}
        >
          {exerciseSaved ? 'Saved ✓' : 'Save exercise goal'}
        </button>
      </section>

      <section className="settings__section">
        <label className="field">
          <span>Weekly PT exercises goal (days)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="7"
            value={ptValue}
            onChange={(e) => setPtValue(e.target.value)}
          />
        </label>
        <button
          className="btn btn--primary"
          onClick={handleSavePt}
          disabled={!isPtValid}
        >
          {ptSaved ? 'Saved ✓' : 'Save PT goal'}
        </button>
      </section>

      <section className="settings__section">
        <h3>Data</h3>
        <p className="settings__hint">
          Download the last 30 days of entries as a JSON backup.
        </p>
        <button className="btn" onClick={handleExport}>
          Export data
        </button>
      </section>

      <section className="settings__section">
        <h3>Account</h3>
        <p className="settings__email">{email}</p>
        <button className="btn btn--danger" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </section>
    </div>
  )
}
