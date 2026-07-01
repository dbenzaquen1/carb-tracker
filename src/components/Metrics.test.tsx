import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Entry } from '../types'
import { Metrics } from './Metrics'

let counter = 0
function entry(date: string, carbs: number): Entry {
  counter += 1
  return {
    id: `e${counter}`,
    user_id: 'u',
    entry_date: date,
    meal: 'snack',
    name: 'food',
    carbs,
    created_at: `${date}T00:00:00Z`,
  }
}

describe('Metrics period selector', () => {
  it('marks the active period and reports a change', async () => {
    const user = userEvent.setup()
    const onChangePeriod = vi.fn()
    render(
      <Metrics
        entries={[]}
        goal={150}
        today="2026-06-28"
        weeklyChecks={[]}
        periodDays={30}
        onChangePeriod={onChangePeriod}
      />,
    )

    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: '90 days' }))
    expect(onChangePeriod).toHaveBeenCalledWith(90)
  })

  it('summarizes carbs over the selected period', () => {
    const entries = [entry('2026-06-27', 100), entry('2026-06-28', 200)]
    render(
      <Metrics
        entries={entries}
        goal={160}
        today="2026-06-28"
        weeklyChecks={[]}
        periodDays={30}
        onChangePeriod={vi.fn()}
      />,
    )
    // Average per logged day = (100 + 200) / 2 = 150.
    expect(screen.getByText('150 g')).toBeInTheDocument()
    expect(screen.getByText('in 30 days')).toBeInTheDocument()
  })
})
