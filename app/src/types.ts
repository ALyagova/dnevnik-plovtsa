export const styles = ['breaststroke', 'freestyle', 'backstroke', 'butterfly', 'medley'] as const
export type SwimStyle = (typeof styles)[number]
export type EventType = 'course' | 'competition'
export type PoolLength = 25 | 50
export type ProgressStatus = 'baseline' | 'improved' | 'worsened' | 'equal'

export interface Athlete {
  id: string
  name: string
  birthDate: string
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface SwimResult {
  id: string
  athleteId: string
  eventType: EventType
  style: SwimStyle
  distanceMeters: number
  durationCentiseconds: number
  swimDate: string
  poolLengthMeters: PoolLength
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export const styleLabels: Record<SwimStyle, string> = {
  breaststroke: 'Брасс',
  freestyle: 'Кроль',
  backstroke: 'Спина',
  butterfly: 'Баттерфляй',
  medley: 'Комплекс',
}

export const distancesFor = (style: SwimStyle) =>
  style === 'medley' ? [100, 200, 400] : [50, 100, 200, 400, 800, 1000, 1500]
