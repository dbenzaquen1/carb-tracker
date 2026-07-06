import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WorkoutSet } from '../types'
import { Workouts } from './Workouts'

function makeSet(overrides: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: 'set-1',
    user_id: 'u1',
    entry_date: '2026-07-06',
    exercise: 'Squats',
    weight: 100,
    reps: 8,
    created_at: '2026-07-06T10:00:00Z',
    ...overrides,
  }
}

function renderWorkouts(props: Partial<Parameters<typeof Workouts>[0]> = {}) {
  const defaults = {
    date: '2026-07-06',
    today: '2026-07-06',
    sets: [] as WorkoutSet[],
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    onPrevDay: vi.fn(),
    onNextDay: vi.fn(),
    onToday: vi.fn(),
    onPickDate: vi.fn(),
  }
  const merged = { ...defaults, ...props }
  render(<Workouts {...merged} />)
  return merged
}

describe('Workouts', () => {
  it('prompts to pick a gym day when nothing is logged', () => {
    renderWorkouts()
    expect(screen.getByRole('group', { name: 'Gym day' })).toBeInTheDocument()
    expect(screen.getByText(/Pick a gym day above/)).toBeInTheDocument()
    expect(screen.queryByText('Squats')).not.toBeInTheDocument()
  })

  it('shows a template’s exercises and targets after picking it', async () => {
    const user = userEvent.setup()
    renderWorkouts()

    await user.click(screen.getByRole('button', { name: 'Lower' }))

    expect(screen.getByText('Squats')).toBeInTheDocument()
    expect(screen.getByText('3 × 8-10')).toBeInTheDocument()
    expect(screen.getByText('Hip thrusts')).toBeInTheDocument()
  })

  it('logs a set with parsed weight and reps', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderWorkouts()

    await user.click(screen.getByRole('button', { name: 'Lower' }))
    const weight = screen.getByLabelText('Squats weight')
    await user.type(weight, '102.5')
    await user.type(screen.getByLabelText('Squats reps'), '8')

    const card = weight.closest('section')!
    await user.click(within(card).getByRole('button', { name: 'Log set' }))

    expect(onAdd).toHaveBeenCalledWith({
      entry_date: '2026-07-06',
      exercise: 'Squats',
      weight: 102.5,
      reps: 8,
    })
  })

  it('infers the gym day from logged sets and shows a last-time hint', () => {
    renderWorkouts({
      sets: [
        makeSet({ id: 'a', entry_date: '2026-07-03', weight: 95, reps: 10 }),
        makeSet({ id: 'b', entry_date: '2026-07-06', weight: 100, reps: 8 }),
      ],
    })

    expect(screen.getByRole('button', { name: 'Lower' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText(/Last: Fri 7\/3/)).toBeInTheDocument()
    expect(screen.getByText('100×8')).toBeInTheDocument()
  })

  it('deletes a logged set', async () => {
    const user = userEvent.setup()
    const { onDelete } = renderWorkouts({ sets: [makeSet({})] })

    await user.click(screen.getByRole('button', { name: 'Delete Squats set' }))
    expect(onDelete).toHaveBeenCalledWith('set-1')
  })

  it('adds an off-plan exercise card to log against', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderWorkouts()

    await user.click(screen.getByRole('button', { name: 'Upper · push' }))
    await user.type(screen.getByLabelText('Extra exercise name'), 'Face pulls')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Face pulls')).toBeInTheDocument()

    const reps = screen.getByLabelText('Face pulls reps')
    await user.type(reps, '15')
    const card = reps.closest('section')!
    await user.click(within(card).getByRole('button', { name: 'Log set' }))

    expect(onAdd).toHaveBeenCalledWith({
      entry_date: '2026-07-06',
      exercise: 'Face pulls',
      weight: 0,
      reps: 15,
    })
  })
})
