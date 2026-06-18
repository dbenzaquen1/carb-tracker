import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddEntryForm } from './AddEntryForm'

describe('AddEntryForm', () => {
  it('keeps Add disabled until a name and carbs are entered', async () => {
    const user = userEvent.setup()
    render(<AddEntryForm date="2026-06-18" onAdd={() => {}} />)

    const add = screen.getByRole('button', { name: 'Add' })
    expect(add).toBeDisabled()

    await user.type(screen.getByLabelText('Food name'), 'Banana')
    expect(add).toBeDisabled()

    await user.type(screen.getByLabelText('Carbs in grams'), '27')
    expect(add).toBeEnabled()
  })

  it('submits a trimmed, parsed entry with the chosen meal and resets', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<AddEntryForm date="2026-06-18" onAdd={onAdd} />)

    await user.type(screen.getByLabelText('Food name'), '  Rice  ')
    await user.type(screen.getByLabelText('Carbs in grams'), '45')
    await user.click(screen.getByRole('button', { name: 'Lunch' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith({
      entry_date: '2026-06-18',
      meal: 'lunch',
      name: 'Rice',
      carbs: 45,
    })
    expect(screen.getByLabelText('Food name')).toHaveValue('')
  })
})
