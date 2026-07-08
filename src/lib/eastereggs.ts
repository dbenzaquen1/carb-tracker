import { addDays, parseISODate } from './dates'
import type { NewWorkoutSet, WorkoutSet } from '../types'

// Fun emoji reactions when logging certain foods. First match wins, so more
// specific names come before their substrings (cupcake/pancake before cake,
// pineapple before apple, popcorn before corn).
const FOOD_EMOJI: { match: string; emoji: string }[] = [
  { match: 'ice cream', emoji: '🍦' },
  { match: 'pizza', emoji: '🍕' },
  { match: 'cupcake', emoji: '🧁' },
  { match: 'pancake', emoji: '🥞' },
  { match: 'cake', emoji: '🎂' },
  { match: 'cookie', emoji: '🍪' },
  { match: 'brownie', emoji: '🍫' },
  { match: 'chocolate', emoji: '🍫' },
  { match: 'doughnut', emoji: '🍩' },
  { match: 'donut', emoji: '🍩' },
  { match: 'candy', emoji: '🍬' },
  { match: 'pie', emoji: '🥧' },
  { match: 'taco', emoji: '🌮' },
  { match: 'burrito', emoji: '🌯' },
  { match: 'hot dog', emoji: '🌭' },
  { match: 'burger', emoji: '🍔' },
  { match: 'fries', emoji: '🍟' },
  { match: 'popcorn', emoji: '🍿' },
  { match: 'corn', emoji: '🌽' },
  { match: 'sushi', emoji: '🍣' },
  { match: 'ramen', emoji: '🍜' },
  { match: 'noodle', emoji: '🍜' },
  { match: 'spaghetti', emoji: '🍝' },
  { match: 'pasta', emoji: '🍝' },
  { match: 'salad', emoji: '🥗' },
  { match: 'avocado', emoji: '🥑' },
  { match: 'bacon', emoji: '🥓' },
  { match: 'shrimp', emoji: '🍤' },
  { match: 'bagel', emoji: '🥯' },
  { match: 'pretzel', emoji: '🥨' },
  { match: 'croissant', emoji: '🥐' },
  { match: 'waffle', emoji: '🧇' },
  { match: 'cheese', emoji: '🧀' },
  { match: 'sandwich', emoji: '🥪' },
  { match: 'coffee', emoji: '☕' },
  { match: 'smoothie', emoji: '🥤' },
  { match: 'wine', emoji: '🍷' },
  { match: 'beer', emoji: '🍺' },
  { match: 'banana', emoji: '🍌' },
  { match: 'pineapple', emoji: '🍍' },
  { match: 'apple', emoji: '🍎' },
  { match: 'watermelon', emoji: '🍉' },
  { match: 'strawberr', emoji: '🍓' },
  { match: 'grape', emoji: '🍇' },
  { match: 'peach', emoji: '🍑' },
  { match: 'mango', emoji: '🥭' },
  { match: 'cherr', emoji: '🍒' },
  { match: 'lemon', emoji: '🍋' },
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

// Exercise streak lengths worth a special cheer. Capped at 30 because the
// default data window only reaches back far enough to count a month.
const STREAK_MILESTONES = [3, 5, 7, 14, 21, 30]

/** A cheer for hitting an exercise streak milestone, or null. */
export function streakCheer(streak: number): string | null {
  return STREAK_MILESTONES.includes(streak)
    ? `${streak}-day exercise streak! 🔥`
    : null
}

/** Whether a local hour counts as midnight-snack territory. */
export function isLateNight(hour: number): boolean {
  return hour >= 22 || hour < 4
}

/**
 * Whether a set is strictly heavier than every previously logged set of the
 * same exercise. Bodyweight sets (weight 0) and first-ever sets don't count —
 * a PR needs a prior record to beat.
 */
export function isNewRecord(
  history: WorkoutSet[],
  set: NewWorkoutSet,
): boolean {
  if (set.weight <= 0) return false
  const exercise = set.exercise.trim().toLowerCase()
  const prior = history.filter(
    (s) => s.exercise.trim().toLowerCase() === exercise,
  )
  return prior.length > 0 && prior.every((s) => s.weight < set.weight)
}

interface Holiday {
  emojis: string[]
  message: string
}

// Fixed-date holiday confetti, keyed by MM-DD.
const HOLIDAYS: Record<string, Holiday> = {
  '01-01': { emojis: ['🎆', '🎇', '✨'], message: 'Happy New Year! 🎆' },
  '02-14': { emojis: ['💘', '❤️', '🌹'], message: "Happy Valentine's Day! 💘" },
  '03-17': { emojis: ['🍀', '🌈'], message: "Happy St. Patrick's Day! 🍀" },
  '07-04': { emojis: ['🎆', '🎇', '🗽'], message: 'Happy 4th of July! 🎆' },
  '10-31': { emojis: ['🎃', '👻', '🦇'], message: 'Happy Halloween! 🎃' },
  '12-25': { emojis: ['🎄', '🎁', '❄️'], message: 'Merry Christmas! 🎄' },
}

// Jewish holidays move against the Gregorian calendar, so they're matched by
// their Hebrew calendar date via Intl. Days are matched by calendar day, not
// from sundown the evening before. Yom Kippur is deliberately absent — no
// food confetti on a fast day.
const hebrewFormat = new Intl.DateTimeFormat('en-u-ca-hebrew', {
  month: 'long',
  day: 'numeric',
})

/** Hebrew calendar month name (e.g. "Tishri", "Adar II") and day-of-month. */
function hebrewDate(iso: string): { month: string; day: number } {
  const parts = hebrewFormat.formatToParts(parseISODate(iso))
  return {
    month: parts.find((p) => p.type === 'month')?.value ?? '',
    day: Number(parts.find((p) => p.type === 'day')?.value ?? 0),
  }
}

/**
 * Hanukkah runs 8 days from 25 Kislev, spilling into Tevet by an amount that
 * depends on Kislev's length, so check whether any of the previous 8 calendar
 * days was 25 Kislev.
 */
function isHanukkah(iso: string): boolean {
  for (let i = 0; i < 8; i++) {
    const { month, day } = hebrewDate(addDays(iso, -i))
    if (month === 'Kislev' && day === 25) return true
  }
  return false
}

function jewishHoliday(iso: string): Holiday | null {
  const { month, day } = hebrewDate(iso)
  if (month === 'Tishri' && day <= 2)
    return { emojis: ['🍎', '🍯', '🐝'], message: 'Shana Tova! 🍎🍯' }
  if (month === 'Tishri' && day >= 15 && day <= 21)
    return { emojis: ['🌿', '🍋', '⛺'], message: 'Happy Sukkot! 🌿' }
  // Purim is 14 Adar — Adar II in leap years, plain Adar otherwise.
  if ((month === 'Adar' || month === 'Adar II') && day === 14)
    return { emojis: ['🎭', '🎉', '🎪'], message: 'Happy Purim! 🎭' }
  if (month === 'Nisan' && day >= 15 && day <= 22)
    return { emojis: ['🍷', '🫓', '✨'], message: 'Happy Passover! 🍷' }
  if (month === 'Sivan' && (day === 6 || day === 7))
    return { emojis: ['🧀', '🌸', '📜'], message: 'Happy Shavuot! 🧀' }
  if (isHanukkah(iso))
    return { emojis: ['🕎', '✨', '🍩'], message: 'Happy Hanukkah! 🕎' }
  return null
}

/** A holiday celebration for the given `YYYY-MM-DD` date, or null. */
export function holidayReaction(isoDate: string): Holiday | null {
  return HOLIDAYS[isoDate.slice(5)] ?? jewishHoliday(isoDate)
}
