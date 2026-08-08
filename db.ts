import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { drizzleTryDb } from "db-result/drizzle";
import type { SqliteDbError } from "db-result/sqlite";
import { relations } from "./schema";

/**
 * Drizzle 1.0 relational queries v2: the database is typed by its relations
 * alone — `defineRelations(tables, ...)` carries the tables, so there is no
 * schema generic and no `schema` config option.
 *
 * Wrapped with db-result's `drizzleTryDb`: every builder chain, transaction,
 * raw execute, and relational query (`db.query.*`) resolves `Result<T, E>`
 * with the sqlite protocol union — classified db failures, transient retries,
 * and read-shape narrowing on relational reads. No `tryDb` litter at call
 * sites; handlers fold the db/* tags they know and throw the rest.
 */
/**
 * The unwrapped drizzle db — for the one remaining degraded shape: explicit
 * `select({ columns })` projections still lose their row type through the
 * wrapped chain (db-result tracks this as a follow-up), so
 * `tryDb(rawDb.select(...)...)` is used for those. `insert`/`update`/`delete`
 * chains keep exact rows through `db` now that the wrapper threads the table
 * generic from the call site.
 */
export const rawDb = drizzle(env.DB, { relations });

export const db = drizzleTryDb<typeof rawDb, SqliteDbError>(rawDb);
