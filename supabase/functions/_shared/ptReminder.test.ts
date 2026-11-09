import { describe, it, expect } from 'vitest'
import {
  businessDaysBetween,
  decideForUser,
  localDateAndMinutes,
  missedBusinessDays,
  parseTimeToMinutes,
  reminderBody,
  shouldRemind,
} from './ptReminder'

describe('businessDaysBetween', () => {
  it('counts weekdays strictly between', () => {
    expect(businessDaysBetween('2026-11-06', '2026-11-11')).toBe(2) // Fri → Wed: Mon, Tue
    expect(businessDaysBetween('2026-11-06', '2026-11-10')).toBe(1) // Fri → Tue
    expect(businessDaysBetween('2026-11-06', '2026-11-09')).toBe(0) // Fri → Mon
    expect(businessDaysBetween('2026-11-04', '2026-11-09')).toBe(2) // Wed → Mon: Thu, Fri
    expect(businessDaysBetween('2026-11-07', '2026-11-11')).toBe(2) // Sat anchor → Wed
  })
})
describe('shouldRemind', () => {
  it('matches the spec examples', () => {
    expect(shouldRemind('2026-11-06', '2026-11-11')).toBe(true) // Fri → Wed
    expect(shouldRemind('2026-11-06', '2026-11-10')).toBe(false) // Fri → Tue
    expect(shouldRemind('2026-11-09', '2026-11-12')).toBe(true) // Mon → Thu
    expect(shouldRemind('2026-11-09', '2026-11-11')).toBe(false) // Mon → Wed
    expect(shouldRemind('2026-11-04', '2026-11-09')).toBe(true) // Wed → Mon
    expect(shouldRemind('2026-11-05', '2026-11-10')).toBe(true) // Thu → Tue
    expect(shouldRemind('2026-11-07', '2026-11-10')).toBe(false) // Sat → Tue (only Mon between)
    expect(shouldRemind('2026-11-07', '2026-11-11')).toBe(true) // Sat → Wed
  })
  it('keeps reminding through the weekend once lapsed', () => {
    expect(shouldRemind('2026-11-04', '2026-11-14')).toBe(true) // Saturday
    expect(shouldRemind('2026-11-04', '2026-11-15')).toBe(true) // Sunday
  })
  it('never reminds on the anchor day', () => {
    expect(shouldRemind('2026-11-11', '2026-11-11')).toBe(false)
  })
})
describe('reminderBody', () => {
  it('formats the count and the never-done case', () => {
    expect(reminderBody(3)).toBe(
      "It's been 3 business days since your last PT session. A few minutes today keeps you on track.",
    )
    expect(reminderBody(null)).toBe(
      'No PT logged yet — a few minutes today keeps you on track.',
    )
  })
})
describe('missedBusinessDays', () => {
  it('includes today when it is a weekday', () => {
    expect(missedBusinessDays('2026-11-06', '2026-11-11')).toBe(3)
    expect(missedBusinessDays('2026-11-06', '2026-11-14')).toBe(5) // Saturday: Mon–Fri
  })
})
describe('parseTimeToMinutes', () => {
  it('accepts HH:MM and HH:MM:SS', () => {
    expect(parseTimeToMinutes('09:00')).toBe(540)
    expect(parseTimeToMinutes('09:30:00')).toBe(570)
  })
  it('falls back to 09:00 for malformed input', () => {
    expect(parseTimeToMinutes('9am')).toBe(540)
    expect(parseTimeToMinutes('')).toBe(540)
  })
})
describe('localDateAndMinutes', () => {
  it('converts to the given zone', () => {
    const now = new Date('2026-11-11T02:30:00Z')
    expect(localDateAndMinutes(now, 'America/New_York')).toEqual({
      dateIso: '2026-11-10',
      minutes: 21 * 60 + 30,
    })
    expect(localDateAndMinutes(now, 'Asia/Tokyo')).toEqual({
      dateIso: '2026-11-11',
      minutes: 11 * 60 + 30,
    })
  })
  it('falls back to UTC for null or bogus zones', () => {
    const now = new Date('2026-11-11T02:30:00Z')
    expect(localDateAndMinutes(now, null)).toEqual({
      dateIso: '2026-11-11',
      minutes: 150,
    })
    expect(localDateAndMinutes(now, 'Not/AZone')).toEqual({
      dateIso: '2026-11-11',
      minutes: 150,
    })
  })
  it('handles the US DST change day', () => {
    // 2026-11-01 02:30 EDT → clocks fall back; 06:30Z is 01:30 EST
    expect(
      localDateAndMinutes(new Date('2026-11-01T06:30:00Z'), 'America/New_York'),
    ).toEqual({ dateIso: '2026-11-01', minutes: 90 })
  })
  it('treats midnight as hour 0, not 24', () => {
    expect(
      localDateAndMinutes(new Date('2026-11-11T00:05:00Z'), 'UTC'),
    ).toEqual({ dateIso: '2026-11-11', minutes: 5 })
  })
})
describe('decideForUser', () => {
  const now = new Date('2026-11-11T14:05:00Z') // 09:05 New York, Wednesday
  const user = {
    reminderTime: '09:00:00',
    timezone: 'America/New_York',
    lastSentOn: null,
    enabledOn: '2026-11-02',
    now,
  }
  it('sends with the business-day body when lapsed', () => {
    expect(decideForUser({ ...user, latestPtDate: '2026-11-06' })).toEqual({
      send: true,
      reason: 'send',
      localDate: '2026-11-11',
      title: 'PT exercises',
      body: "It's been 3 business days since your last PT session. A few minutes today keeps you on track.",
    })
  })
  it('uses enabledOn and the never-done body when no PT row exists', () => {
    expect(decideForUser({ ...user, latestPtDate: null }).body).toBe(
      'No PT logged yet — a few minutes today keeps you on track.',
    )
    expect(
      decideForUser({ ...user, latestPtDate: null, enabledOn: '2026-11-10' })
        .reason,
    ).toBe('not-lapsed')
  })
  it('does not send when there is no anchor at all', () => {
    expect(
      decideForUser({ ...user, latestPtDate: null, enabledOn: null }),
    ).toEqual({ send: false, reason: 'no-anchor', localDate: '2026-11-11' })
  })
  it('reports not-time, already-sent and not-lapsed', () => {
    expect(
      decideForUser({
        ...user,
        latestPtDate: '2026-11-06',
        now: new Date('2026-11-11T13:00:00Z'),
      }).reason,
    ).toBe('not-time')
    expect(
      decideForUser({
        ...user,
        latestPtDate: '2026-11-06',
        lastSentOn: '2026-11-11',
      }).reason,
    ).toBe('already-sent')
    expect(decideForUser({ ...user, latestPtDate: '2026-11-10' }).reason).toBe(
      'not-lapsed',
    )
  })
})
