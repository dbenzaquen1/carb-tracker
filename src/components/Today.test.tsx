import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Entry } from '../types'
import { Today } from './Today'

const noop = () => {}

function renderDay(date: string, today: string, overrides = {}) {
  const props = {
    date,
    today,
    goal: 150,
    entries: [] as Entry[],
    onAdd: noop,
    onUpdate: noop,
    onDelete: noop,
    onPrevDay: vi.fn(),
    onNextDay: vi.fn(),
    onToday: vi.fn(),
    checks: [],
    ...overrides,
  }
  render(<Today {...props} />)
  return props
}

describe('Today day navigation', () => {
  it('labels the current day and disables forward navigation', () => {
    renderDay('2026-06-18', '2026-06-18')
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
    // No "jump to today" shortcut when already on today.
    expect(screen.queryByText('Jump to today')).not.toBeInTheDocument()
  })

  it('navigates to the previous day', async () => {
    const user = userEvent.setup()
    const props = renderDay('2026-06-18', '2026-06-18')
    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(props.onPrevDay).toHaveBeenCalledTimes(1)
  })

  it('shows Yesterday and lets you jump back to today on a past day', async () => {
    const user = userEvent.setup()
    const props = renderDay('2026-06-17', '2026-06-18')
    expect(screen.getByText('Yesterday')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Next day' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect(props.onNextDay).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Jump to today' }))
    expect(props.onToday).toHaveBeenCalledTimes(1)
  })

  it('uses a past-day empty message when nothing is logged', () => {
    renderDay('2026-06-17', '2026-06-18')
    expect(
      screen.getByText(/No entries logged for this day/i),
    ).toBeInTheDocument()
  })
})

describe('Today daily checks', () => {
  it('renders a check unchecked and fires its onToggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderDay('2026-06-18', '2026-06-18', {
      checks: [
        {
          key: 'exercise',
          done: false,
          onToggle,
          idleLabel: 'Mark exercise done',
          doneLabel: 'Exercise done',
        },
      ],
    })
    const toggle = screen.getByRole('button', { name: 'Mark exercise done' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders multiple checks with their done state', () => {
    renderDay('2026-06-18', '2026-06-18', {
      checks: [
        {
          key: 'exercise',
          done: true,
          onToggle: vi.fn(),
          idleLabel: 'Mark exercise done',
          doneLabel: 'Exercise done',
        },
        {
          key: 'pt',
          done: false,
          onToggle: vi.fn(),
          idleLabel: 'Mark PT exercises done',
          doneLabel: 'PT exercises done',
        },
      ],
    })
    expect(
      screen.getByRole('button', { name: 'Exercise done' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Mark PT exercises done' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })
})
