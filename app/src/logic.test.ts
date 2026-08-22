import { describe, expect, it } from 'vitest'
import { formatDuration, parseDuration, progressFor } from './logic'
import type { SwimResult } from './types'

const result = (id: string, swimDate: string, durationCentiseconds: number): SwimResult => ({ id, athleteId: 'a', style: 'freestyle', distanceMeters: 100, eventType: 'course', poolLengthMeters: 25, swimDate, durationCentiseconds, createdAt: `${swimDate}T10:00:00.000Z`, updatedAt: `${swimDate}T10:00:00.000Z` })

describe('время и прогресс', () => {
  it('форматирует и проверяет время', () => {
    expect(formatDuration(8437)).toBe('01:24.37')
    expect(parseDuration('01', '24', '37')).toBe(8437)
    expect(parseDuration('00', '60', '00')).toBeNull()
    expect(parseDuration('00', '00', '00')).toBeNull()
  })
  it('считает базовую, улучшение, ухудшение и равный результат хронологически', () => {
    const statuses = progressFor([result('d', '2026-03-20', 7910), result('b', '2026-03-10', 7850), result('a', '2026-03-01', 8000), result('c', '2026-03-15', 7910)])
    expect(statuses.get('a')).toBe('baseline')
    expect(statuses.get('b')).toBe('improved')
    expect(statuses.get('c')).toBe('worsened')
    expect(statuses.get('d')).toBe('equal')
  })
})
