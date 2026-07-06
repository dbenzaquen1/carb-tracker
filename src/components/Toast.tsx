import type { ReactNode } from 'react'

/** A small transient message pill near the bottom of the screen. */
export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="toast" role="status">
      {children}
    </div>
  )
}
