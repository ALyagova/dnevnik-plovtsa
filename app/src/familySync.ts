import db from './db'
import type { Athlete, SwimResult } from './types'

const API_URL = 'https://dnevnik-plovtsa-api.aalyagova.workers.dev'
const CODE_KEY = 'dnevnik-plovtsa-family-code'

export type FamilyState = { athlete: Athlete | null; results: SwimResult[] }

/**
 * Older versions of the family Worker could return a saved response envelope
 * inside its `state` property.  Unwrap it defensively so a new device can
 * still join an existing family instead of failing on an undefined results
 * list.
 */
export function normalizeFamilyState(value: unknown): FamilyState | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  if (!('athlete' in record) && !('results' in record) && 'state' in record) {
    return normalizeFamilyState(record.state)
  }

  return {
    athlete: record.athlete && typeof record.athlete === 'object' ? record.athlete as Athlete : null,
    results: Array.isArray(record.results) ? record.results as SwimResult[] : [],
  }
}

export const getFamilyCode = () => localStorage.getItem(CODE_KEY) ?? ''
export const saveFamilyCode = (code: string) => localStorage.setItem(CODE_KEY, code.trim())

const newest = <T extends { id: string; updatedAt: string }>(local: T[], remote: T[]) => {
  const values = new Map<string, T>()
  for (const item of [...remote, ...local]) {
    const previous = values.get(item.id)
    if (!previous || item.updatedAt >= previous.updatedAt) values.set(item.id, item)
  }
  return [...values.values()]
}

export async function snapshot(): Promise<FamilyState> {
  return { athlete: (await db.athletes.toCollection().first()) ?? null, results: await db.results.toArray() }
}

async function replaceLocal(state: FamilyState) {
  await db.transaction('rw', db.athletes, db.results, async () => {
    await db.athletes.clear()
    await db.results.clear()
    if (state.athlete) await db.athletes.put(state.athlete)
    if (state.results.length) await db.results.bulkPut(state.results)
  })
}

function merge(local: FamilyState, remote: FamilyState): FamilyState {
  const athlete = !remote.athlete
    ? local.athlete
    : !local.athlete || local.athlete.id !== remote.athlete.id || local.athlete.updatedAt < remote.athlete.updatedAt
      ? remote.athlete
      : local.athlete
  return { athlete, results: newest(local.results, remote.results) }
}

async function request(code: string, method: 'GET' | 'PUT', state?: FamilyState) {
  let response: Response
  try {
    response = await fetch(`${API_URL}/state`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Family-Code': code },
      body: state ? JSON.stringify(state) : undefined,
    })
  } catch {
    throw new Error('Нет связи с семейным сервером')
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('Проверьте семейный код')
    if (response.status >= 500) throw new Error('Ошибка семейного сервера: проверьте подключение базы данных')
    throw new Error(`Сервер вернул ошибку ${response.status}`)
  }
  return response.json() as Promise<unknown>
}

export async function synchronizeFamily(code = getFamilyCode()) {
  const normalizedCode = code.trim()
  if (!normalizedCode) throw new Error('Введите семейный код')
  const local = await snapshot()
  const serverResponse = await request(normalizedCode, 'GET')
  const remote = normalizeFamilyState(serverResponse)
  const merged = remote ? merge(local, remote) : local
  await replaceLocal(merged)
  await request(normalizedCode, 'PUT', merged)
  await db.outbox.clear()
  return merged
}
