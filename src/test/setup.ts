import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// With Vitest globals disabled, Testing Library can't auto-register cleanup,
// so unmount and clear the DOM between tests ourselves.
afterEach(() => {
  cleanup()
})
