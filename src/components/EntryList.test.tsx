import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Entry } from '../types'
import { EntryList } from './EntryList'

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: '1',
    user_id: 'u',
    entry_date: '2026-06-18',
    meal: 'lunch',
    name: 'Rice',
    carbs: 45,
    created_at: '2026-06-18T00:00:00Z',
    ...overrides,
  }
}

describe('EntryList editing', () => {
  it('edits an entry and calls onUpdate with the new values', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(
      <EntryList
        entries={[makeEntry()]}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Rice' }))

    const nameInput = screen.getByLabelText('Edit food name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Brown rice')

    const carbsInput = screen.getByLabelText('Edit carbs in grams')
    await user.clear(carbsInput)
    await user.type(carbsInput, '50')

    await user.selectOptions(screen.getByLabelText('Edit meal'), 'dinner')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith('1', {
      name: 'Brown rice',
      carbs: 50,
      meal: 'dinner',
    })
  })

  it('cancels editing without calling onUpdate and restores the view', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(
      <EntryList
        entries={[makeEntry()]}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Rice' }))
    const carbsInput = screen.getByLabelText('Edit carbs in grams')
    await user.clear(carbsInput)
    await user.type(carbsInput, '99')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onUpdate).not.toHaveBeenCalled()
    // Back in read-only mode: the edit field is gone and the row's edit
    // control is showing again.
    expect(
      screen.queryByLabelText('Edit carbs in grams'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit Rice' }),
    ).toBeInTheDocument()
  })

  it('keeps Save disabled when the name is cleared', async () => {
    const user = userEvent.setup()
    render(
      <EntryList
        entries={[makeEntry()]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Rice' }))
    await user.clear(screen.getByLabelText('Edit food name'))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
