import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PtRemindersState } from '../hooks/usePtReminders'
import { PtReminderSettings } from './PtReminderSettings'

const TOGGLE = "Remind me when I've missed PT for 2 business days"

function makeState(
  overrides: Partial<PtRemindersState> = {},
): PtRemindersState {
  return {
    supported: true,
    configured: true,
    enabled: false,
    time: '09:00',
    loading: false,
    busy: false,
    error: null,
    enable: vi.fn().mockResolvedValue(undefined),
    disable: vi.fn().mockResolvedValue(undefined),
    saveTime: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderIt(overrides: Partial<PtRemindersState> = {}) {
  const state = makeState(overrides)
  render(<PtReminderSettings {...state} />)
  return state
}

describe('PtReminderSettings', () => {
  it('renders the toggle unchecked with no time input when off', () => {
    renderIt()
    expect(screen.getByRole('heading', { name: 'PT reminders' })).toBeTruthy()
    const box = screen.getByRole('checkbox', {
      name: TOGGLE,
    }) as HTMLInputElement
    expect(box.checked).toBe(false)
    expect(screen.queryByLabelText('Reminder time')).toBeNull()
  })

  it('calls enable when the toggle is switched on', async () => {
    const state = renderIt()
    await userEvent.click(screen.getByRole('checkbox', { name: TOGGLE }))
    expect(state.enable).toHaveBeenCalledTimes(1)
    expect(state.disable).not.toHaveBeenCalled()
  })

  it('shows status, time input and calls disable when on', async () => {
    const state = renderIt({ enabled: true })
    expect(screen.getByText('Reminders on for this device.')).toBeTruthy()
    const time = screen.getByLabelText('Reminder time') as HTMLInputElement
    expect(time.value).toBe('09:00')
    await userEvent.click(screen.getByRole('checkbox', { name: TOGGLE }))
    expect(state.disable).toHaveBeenCalledTimes(1)
    expect(state.enable).not.toHaveBeenCalled()
  })

  it('saves a changed time on change', () => {
    const state = renderIt({ enabled: true })
    fireEvent.change(screen.getByLabelText('Reminder time'), {
      target: { value: '08:15' },
    })
    expect(state.saveTime).toHaveBeenCalledWith('08:15')
  })

  it('does not save an empty time', () => {
    const state = renderIt({ enabled: true })
    fireEvent.change(screen.getByLabelText('Reminder time'), {
      target: { value: '' },
    })
    expect(state.saveTime).not.toHaveBeenCalled()
  })

  it('shows the error message under the toggle', () => {
    renderIt({ error: 'Install the app to your home screen first' })
    expect(screen.getByRole('alert').textContent).toBe(
      'Install the app to your home screen first',
    )
  })

  it('shows the not-configured message and disables the toggle when unconfigured', () => {
    renderIt({ configured: false })
    expect(
      screen.getByText('Reminders are not configured for this deployment'),
    ).toBeTruthy()
    expect(
      (screen.getByRole('checkbox', { name: TOGGLE }) as HTMLInputElement)
        .disabled,
    ).toBe(true)
  })

  it('disables the toggle while busy', () => {
    renderIt({ busy: true })
    expect(
      (screen.getByRole('checkbox', { name: TOGGLE }) as HTMLInputElement)
        .disabled,
    ).toBe(true)
  })

  it('disables the toggle while loading', () => {
    renderIt({ loading: true })
    expect(
      (screen.getByRole('checkbox', { name: TOGGLE }) as HTMLInputElement)
        .disabled,
    ).toBe(true)
  })

  it('keeps the toggle enabled when unsupported so enable can explain why', async () => {
    const state = renderIt({ supported: false })
    const box = screen.getByRole('checkbox', {
      name: TOGGLE,
    }) as HTMLInputElement
    expect(box.disabled).toBe(false)
    await userEvent.click(box)
    expect(state.enable).toHaveBeenCalledTimes(1)
  })
})
