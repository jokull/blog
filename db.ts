import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { drizzleTryDb } from "db-result/drizzle";
import type { SqliteDbError } from "db-result/sqlite";
import type { DbError } from "db-result";
import { relations } from "./schema";
import type { Result } from "better-result";

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
 * The unwrapped drizzle db — for row-exact writes. The wrapped chains degrade
 * row types (documented sharp edge); `tryDb(rawDb.insert(...)...returning())`
 * keeps drizzle's own rows with the same classification and retry.
 */
export const rawDb = drizzle(env.DB, { relations });

export const db = drizzleTryDb<typeof rawDb, SqliteDbError>(rawDb);

/**
 * The defect channel: a classified DB failure that is not a declared fold is
 * thrown so the RPC boundary can incidentId it — the bare-await behavior,
 * now classified and retried.
 */
export const orThrow = <T>(result: Result<T, DbError>): T => {
	if (result.isErr()) throw result.error;
	return result.value;
};
