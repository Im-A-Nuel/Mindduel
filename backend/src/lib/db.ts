import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL is required (set in backend/.env)')
}

// Single shared client. `prepare: false` is required for Neon's pooler
// (transaction-mode pooling does not support PostgreSQL prepared statements).
const client = postgres(url, { prepare: false, max: 10 })

export const db = drizzle(client, { schema })
export { schema }
