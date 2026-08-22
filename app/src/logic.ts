import type { ProgressStatus, SwimResult } from './types'

export const formatDuration = (centiseconds: number) => {
  const minutes = Math.floor(centiseconds / 6000)
  const seconds = Math.floor((centiseconds % 6000) / 100)
  const hundredths = centiseconds % 100
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`
}

export const parseDuration = (minutes: string, seconds: string, hundredths: string): number | null => {
  const min = Number(minutes)
  const sec = Number(seconds)
  const cs = Number(hundredths)
  if (!Number.isInteger(min) || !Number.isInteger(sec) || !Number.isInteger(cs) || min < 0 || sec < 0 || sec > 59 || cs < 0 || cs > 99) return null
  const total = min * 6000 + sec * 100 + cs
  return total > 0 ? total : null
}

export const progressFor = (results: SwimResult[]) => {
  const chronological = results
    .filter((result) => !result.deletedAt)
    .slice()
    .sort((a, b) => a.swimDate.localeCompare(b.swimDate) || a.createdAt.localeCompare(b.createdAt))
  const statuses = new Map<string, ProgressStatus>()
  chronological.forEach((result, index) => {
    const previous = chronological[index - 1]
    if (!previous) statuses.set(result.id, 'baseline')
    else if (result.durationCentiseconds < previous.durationCentiseconds) statuses.set(result.id, 'improved')
    else if (result.durationCentiseconds > previous.durationCentiseconds) statuses.set(result.id, 'worsened')
    else statuses.set(result.id, 'equal')
  })
  return statuses
}

export const displayDate = (date: string) => new Intl.DateTimeFormat('ru-RU').format(new Date(`${date}T12:00:00`))

export const newId = () => crypto.randomUUID()
