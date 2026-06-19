export type Tab = 'today' | 'metrics' | 'admin' | 'settings'

interface TabDef {
  id: Tab
  label: string
  icon: string
  adminOnly?: boolean
}

const TABS: TabDef[] = [
  { id: 'today', label: 'Today', icon: '🍽️' },
  { id: 'metrics', label: 'Trends', icon: '📈' },
  { id: 'admin', label: 'Admin', icon: '🛡️', adminOnly: true },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  isAdmin?: boolean
}

export function BottomNav({ active, onChange, isAdmin = false }: Props) {
  const tabs = TABS.filter((tab) => !tab.adminOnly || isAdmin)

  return (
    <nav
      className="bottom-nav"
      aria-label="Primary"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`bottom-nav__item ${active === tab.id ? 'is-active' : ''}`}
          aria-current={active === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
