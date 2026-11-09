import type { PtRemindersState } from '../hooks/usePtReminders'

export function PtReminderSettings({
  configured,
  enabled,
  time,
  loading,
  busy,
  error,
  enable,
  disable,
  saveTime,
}: PtRemindersState) {
  return (
    <section className="settings__section">
      <h3>PT reminders</h3>
      <label className="field field--toggle">
        <input
          type="checkbox"
          checked={enabled}
          disabled={!configured || loading || busy}
          onChange={() => void (enabled ? disable() : enable())}
        />
        <span>Remind me when I've missed PT for 2 business days</span>
      </label>
      {!configured && (
        <p className="settings__hint">
          Reminders are not configured for this deployment
        </p>
      )}
      {enabled && (
        <>
          <p className="settings__hint">Reminders on for this device.</p>
          <label className="field">
            <span>Reminder time</span>
            <input
              type="time"
              step="900"
              value={time}
              onChange={(e) => {
                if (e.target.value) void saveTime(e.target.value)
              }}
            />
          </label>
        </>
      )}
      {error && (
        <p className="settings__hint" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
