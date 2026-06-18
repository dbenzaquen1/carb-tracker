import { useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { addDays, lastNDays, todayISO } from './lib/dates'
import { useAuth } from './hooks/useAuth'
import { useEntries } from './hooks/useEntries'
import { useExercise } from './hooks/useExercise'
import { useProfile } from './hooks/useProfile'
import { BottomNav, type Tab } from './components/BottomNav'
import { ConfigNeeded } from './components/ConfigNeeded'
import { Login } from './components/Login'
import { Metrics } from './components/Metrics'
import { Settings } from './components/Settings'
import { Spinner } from './components/Spinner'
import { Today } from './components/Today'

export default function App() {
  const { user, loading } = useAuth()

  if (!isSupabaseConfigured) return <ConfigNeeded />
  if (loading) {
    return (
      <div className="app-center">
        <Spinner label="Starting up…" />
      </div>
    )
  }
  if (!user) return <Login />

  return <AuthedApp userId={user.id} email={user.email ?? ''} />
}

function AuthedApp({ userId, email }: { userId: string; email: string }) {
  const today = todayISO()
  const [tab, setTab] = useState<Tab>('today')
  const [selectedDate, setSelectedDate] = useState(today)

  // Load at least the last 30 days (for metrics), and widen the window back to
  // the selected day if the user browses further into the past.
  const earliest = lastNDays(30, today)[0]
  const fromDate = selectedDate < earliest ? selectedDate : earliest

  const { goal, weeklyExerciseGoal, updateGoal, updateWeeklyExerciseGoal } =
    useProfile(userId)
  const { entries, loading, error, addEntry, updateEntry, deleteEntry } =
    useEntries(userId, fromDate, today)
  const { exercisedDates, toggle: toggleExercise } = useExercise(
    userId,
    fromDate,
    today,
  )

  const dayEntries = entries.filter((e) => e.entry_date === selectedDate)

  function goToTab(next: Tab) {
    // Tapping the Today tab acts as a "home" button back to the current day.
    if (next === 'today') setSelectedDate(today)
    setTab(next)
  }

  function goPrevDay() {
    setSelectedDate((d) => addDays(d, -1))
  }

  function goNextDay() {
    setSelectedDate((d) => (d >= today ? d : addDays(d, 1)))
  }

  async function handleSignOut() {
    await supabase?.auth.signOut()
  }

  return (
    <div className="app">
      <header className="app__bar">
        <h1 className="app__title">Carb Tracker</h1>
      </header>

      <main className="app__main">
        {error && <p className="banner banner--error">{error}</p>}

        {tab === 'today' &&
          (loading ? (
            <Spinner />
          ) : (
            <Today
              date={selectedDate}
              today={today}
              goal={goal}
              entries={dayEntries}
              onAdd={addEntry}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
              onPrevDay={goPrevDay}
              onNextDay={goNextDay}
              onToday={() => setSelectedDate(today)}
              exercised={exercisedDates.has(selectedDate)}
              onToggleExercise={() => toggleExercise(selectedDate)}
            />
          ))}

        {tab === 'metrics' &&
          (loading ? (
            <Spinner />
          ) : (
            <Metrics
              entries={entries}
              goal={goal}
              today={today}
              exercisedDates={exercisedDates}
              weeklyExerciseGoal={weeklyExerciseGoal}
            />
          ))}

        {tab === 'settings' && (
          <Settings
            goal={goal}
            weeklyExerciseGoal={weeklyExerciseGoal}
            email={email}
            entries={entries}
            onSaveGoal={updateGoal}
            onSaveWeeklyExerciseGoal={updateWeeklyExerciseGoal}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={goToTab} />
    </div>
  )
}
