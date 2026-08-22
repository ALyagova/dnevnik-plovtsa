import Dexie, { type EntityTable } from 'dexie'
import type { Athlete, SwimResult } from './types'

export interface OutboxOperation {
  id: string
  type: 'upsert-athlete' | 'upsert-result' | 'delete-result'
  entityId: string
  createdAt: string
}

const db = new Dexie('dnevnik-plovtsa') as Dexie & {
  athletes: EntityTable<Athlete, 'id'>
  results: EntityTable<SwimResult, 'id'>
  outbox: EntityTable<OutboxOperation, 'id'>
}

db.version(1).stores({
  athletes: 'id, updatedAt',
  results: 'id, athleteId, [style+distanceMeters], swimDate, updatedAt, deletedAt',
  outbox: 'id, entityId, createdAt',
})

export default db
