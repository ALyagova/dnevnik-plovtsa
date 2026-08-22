import { describe, expect, it } from 'vitest'
import { normalizeFamilyState } from './familySync'

describe('семейная синхронизация', () => {
  it('распаковывает старый вложенный ответ сервера', () => {
    const athlete = { id: 'athlete-1', name: 'Тест', birthDate: '2010-01-01', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
    const result = { id: 'result-1', athleteId: 'athlete-1', style: 'freestyle', distanceMeters: 100, eventType: 'course', poolLengthMeters: 25, swimDate: '2026-01-01', durationCentiseconds: 7850, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }

    expect(normalizeFamilyState({ state: { state: { athlete, results: [result] } } })).toEqual({ athlete, results: [result] })
  })

  it('не падает на пустом или неполном ответе', () => {
    expect(normalizeFamilyState({ state: { athlete: null } })).toEqual({ athlete: null, results: [] })
    expect(normalizeFamilyState(null)).toBeNull()
  })
})
