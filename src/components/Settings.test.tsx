import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PtRemindersState } from '../hooks/usePtReminders'
import { Settings } from './Settings'

const TOGGLE = "Remind me when I've missed PT for 2 business days"

function makeReminders(
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

function setup() {
  const props = {
    goal: 100,
    weeklyExerciseGoal: 3,
    weeklyPtGoal: 4,
    weeklySkinCreamGoal: 5,
    email: 'wife@example.com',
    entries: [],
    ptReminders: makeReminders(),
    onSaveGoal: vi.fn(),
    onSaveWeeklyExerciseGoal: vi.fn(),
    onSaveWeeklyPtGoal: vi.fn(),
    onSaveWeeklySkinCreamGoal: vi.fn(),
    onSignOut: vi.fn(),
  }
  render(<Settings {...props} />)
  return props
}

async function setNumber(label: string, value: string) {
  const input = screen.getByLabelText(label)
  await userEvent.clear(input)
  await userEvent.type(input, value)
}

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders headings, email and the reminders section', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'PT reminders' })).toBeTruthy()
    expect(screen.getByText('wife@example.com')).toBeTruthy()
  })

  it('places the reminders toggle between the PT and skin cream goals', () => {
    setup()
    const ptInput = screen.getByLabelText('Weekly PT exercises goal (days)')
    const toggle = screen.getByRole('checkbox', { name: TOGGLE })
    const skinInput = screen.getByLabelText('Weekly skin cream goal (days)')
    const follows = Node.DOCUMENT_POSITION_FOLLOWING
    expect(ptInput.compareDocumentPosition(toggle) & follows).toBeTruthy()
    expect(toggle.compareDocumentPosition(skinInput) & follows).toBeTruthy()
  })

  it('calls ptReminders.enable when the toggle is clicked', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('checkbox', { name: TOGGLE }))
    expect(props.ptReminders.enable).toHaveBeenCalledTimes(1)
  })

  it('saves the daily carb goal and shows Saved', async () => {
    const props = setup()
    await setNumber('Daily carb goal (g)', '150')
    await userEvent.click(screen.getByRole('button', { name: 'Save goal' }))
    expect(props.onSaveGoal).toHaveBeenCalledWith(150)
    expect(await screen.findByText('Saved ✓')).toBeTruthy()
  })

  it('rounds and saves the weekly exercise goal', async () => {
    const props = setup()
    await setNumber('Weekly exercise goal (days)', '2.6')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save exercise goal' }),
    )
    expect(props.onSaveWeeklyExerciseGoal).toHaveBeenCalledWith(3)
    expect(await screen.findByText('Saved ✓')).toBeTruthy()
  })

  it('saves the weekly PT goal', async () => {
    const props = setup()
    await setNumber('Weekly PT exercises goal (days)', '6')
    await userEvent.click(screen.getByRole('button', { name: 'Save PT goal' }))
    expect(props.onSaveWeeklyPtGoal).toHaveBeenCalledWith(6)
    expect(await screen.findByText('Saved ✓')).toBeTruthy()
  })

  it('saves the weekly skin cream goal', async () => {
    const props = setup()
    await setNumber('Weekly skin cream goal (days)', '7')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save skin cream goal' }),
    )
    expect(props.onSaveWeeklySkinCreamGoal).toHaveBeenCalledWith(7)
    expect(await screen.findByText('Saved ✓')).toBeTruthy()
  })

  it('disables each save button for an invalid value', async () => {
    const props = setup()
    const disabled = (name: string) =>
      (screen.getByRole('button', { name }) as HTMLButtonElement).disabled

    await setNumber('Daily carb goal (g)', '0')
    expect(disabled('Save goal')).toBe(true)
    await setNumber('Weekly exercise goal (days)', '8')
    expect(disabled('Save exercise goal')).toBe(true)
    await setNumber('Weekly PT exercises goal (days)', '0')
    expect(disabled('Save PT goal')).toBe(true)
    await setNumber('Weekly skin cream goal (days)', '8')
    expect(disabled('Save skin cream goal')).toBe(true)

    expect(props.onSaveGoal).not.toHaveBeenCalled()
    expect(props.onSaveWeeklyExerciseGoal).not.toHaveBeenCalled()
    expect(props.onSaveWeeklyPtGoal).not.toHaveBeenCalled()
    expect(props.onSaveWeeklySkinCreamGoal).not.toHaveBeenCalled()
  })

  it('selects a theme and applies it', async () => {
    setup()
    const dark = screen.getByRole('button', { name: 'Dark' })
    expect(dark.getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(dark)
    expect(dark.getAttribute('aria-pressed')).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'System' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('carb-tracker-theme')).toBe('dark')
  })

  it('calls onSignOut', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(props.onSignOut).toHaveBeenCalledTimes(1)
  })

  it('exports data through an object URL download', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:test')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
      writable: true,
    })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Export data' }))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
