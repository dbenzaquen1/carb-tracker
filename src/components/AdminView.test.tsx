import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AdminUser } from '../lib/admin'
import { AdminView } from './AdminView'

function user(
  id: string,
  email: string,
  over: Partial<AdminUser> = {},
): AdminUser {
  return {
    id,
    email,
    dailyGoal: 150,
    weeklyExerciseGoal: 5,
    weeklyPtGoal: 7,
    weeklySkinCreamGoal: 7,
    isAdmin: false,
    entries: [],
    exercisedDates: new Set(),
    ptDates: new Set(),
    skinCreamDates: new Set(),
    ...over,
  }
}

const USERS = [user('u1', 'ann@example.com'), user('u2', 'bob@example.com')]

describe('AdminView', () => {
  it('lists users and filters by email', async () => {
    const u = userEvent.setup()
    render(
      <AdminView
        users={USERS}
        today="2026-06-18"
        loading={false}
        error={null}
      />,
    )

    expect(screen.getByText('ann@example.com')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()

    await u.type(screen.getByLabelText('Search users by email'), 'bob')
    expect(screen.queryByText('ann@example.com')).not.toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('expands a user to show their detail', async () => {
    const u = userEvent.setup()
    render(
      <AdminView
        users={USERS}
        today="2026-06-18"
        loading={false}
        error={null}
      />,
    )

    await u.click(screen.getByRole('button', { name: /bob@example.com/ }))
    expect(screen.getByText(/Daily goal/)).toBeInTheDocument()
    expect(screen.getByText(/Exercise today/)).toBeInTheDocument()
  })

  it('shows a loading state', () => {
    render(
      <AdminView users={[]} today="2026-06-18" loading={true} error={null} />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
