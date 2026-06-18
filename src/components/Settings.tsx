import { useEffect, useState } from 'react'
import { todayISO } from '../lib/dates'
import type { Entry } from '../types'

interface Props {
  goal: number
  email: string
  entries: Entry[]
  onSaveGoal: (goal: number) => void | Promise<void>
  onSignOut: () => void | Promise<void>
}

export function Settings({
  goal,
  email,
  entries,
  onSaveGoal,
  onSignOut,
}: Props) {
  const [value, setValue] = useState(String(goal))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(String(goal))
  }, [goal])

  const parsed = Number(value)
  const isValid = Number.isFinite(parsed) && parsed > 0

  async function handleSave() {
    if (!isValid) return
    await onSaveGoal(Math.round(parsed))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
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
