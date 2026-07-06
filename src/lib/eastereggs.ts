// Fun emoji reactions when logging certain foods. First match wins.
const FOOD_EMOJI: { match: string; emoji: string }[] = [
  { match: 'ice cream', emoji: '🍦' },
  { match: 'pizza', emoji: '🍕' },
  { match: 'cake', emoji: '🎂' },
  { match: 'cookie', emoji: '🍪' },
  { match: 'chocolate', emoji: '🍫' },
  { match: 'donut', emoji: '🍩' },
  { match: 'candy', emoji: '🍬' },
  { match: 'taco', emoji: '🌮' },
  { match: 'burrito', emoji: '🌯' },
  { match: 'burger', emoji: '🍔' },
  { match: 'fries', emoji: '🍟' },
  { match: 'popcorn', emoji: '🍿' },
  { match: 'sushi', emoji: '🍣' },
  { match: 'coffee', emoji: '☕' },
  { match: 'wine', emoji: '🍷' },
  { match: 'beer', emoji: '🍺' },
  { match: 'banana', emoji: '🍌' },
  { match: 'apple', emoji: '🍎' },
  { match: 'watermelon', emoji: '🍉' },
]

/** An emoji to celebrate a logged food with, or null for no reaction. */
export function foodReaction(name: string): string | null {
  const lower = name.toLowerCase()
  for (const { match, emoji } of FOOD_EMOJI) {
    if (lower.includes(match)) return emoji
  }
  return null
}

/** Number of title taps that unlocks the hidden note. */
export const TITLE_TAP_SECRET = 7
