import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { relations } from "./schema";

/**
 * Drizzle 1.0 relational queries v2: the database is typed by its relations
 * alone — `defineRelations(tables, ...)` carries the tables, so there is no
 * schema generic and no `schema` config option.
 */
export const db = drizzle(env.DB, { relations });
