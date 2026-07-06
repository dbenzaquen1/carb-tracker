import { useMemo } from 'react'

interface Props {
  emojis: string[]
  count?: number
}

/**
 * A one-shot burst of falling emoji. Purely decorative (aria-hidden,
 * pointer-events: none). Give it a changing `key` to replay. CSS disables the
 * animation under prefers-reduced-motion.
 */
export function Confetti({ emojis, count = 22 }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        emoji: emojis[i % emojis.length],
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 400) / 1000,
        duration: 1.6 + Math.round(Math.random() * 12) / 10,
        rotate: Math.round(Math.random() * 720 - 360),
      })),
    [emojis, count],
  )

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti__piece"
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--rot': `${p.rotate}deg`,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}
