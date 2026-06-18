import { useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { lastNDays, todayISO } from './lib/dates'
import { useAuth } from './hooks/useAuth'
import { useEntries } from './hooks/useEntries'
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
  const range = lastNDays(30, today)
  const fromDate = range[0]

  const { goal, updateGoal } = useProfile(userId)
  const { entries, loading, error, addEntry, deleteEntry } = useEntries(
    userId,
    fromDate,
    today,
  )
  const [tab, setTab] = useState<Tab>('today')

  const todaysEntries = entries.filter((e) => e.entry_date === today)

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
              date={today}
              goal={goal}
              entries={todaysEntries}
              onAdd={addEntry}
              onDelete={deleteEntry}
            />
          ))}

        {tab === 'metrics' &&
          (loading ? (
            <Spinner />
          ) : (
            <Metrics entries={entries} goal={goal} today={today} />
          ))}

        {tab === 'settings' && (
          <Settings
            goal={goal}
            email={email}
            entries={entries}
            onSaveGoal={updateGoal}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
