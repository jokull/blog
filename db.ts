import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
// @ts-expect-error — virtual module provided by @cloudflare/vite-plugin at runtime
import { env } from "cloudflare:workers";
import * as schema from "./schema";
import { relations } from "./schema";

type Database = DrizzleD1Database<typeof schema, typeof relations>;

let _db: Database | undefined;

export function getDb() {
	_db ??= drizzle<typeof schema, typeof relations>(
		// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- Cloudflare provides DB through a Vite virtual module at runtime.
		(env as Record<string, unknown>).DB as Parameters<typeof drizzle>[0],
		{
			schema,
			relations,
		},
	);
	return _db;
}

// Proxy so existing `import { db }` calls keep working
// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- The proxy forwards every property to the lazily-created Drizzle instance.
export const db = new Proxy({} as Database, {
	get(_, prop: keyof Database) {
		const real = getDb();
		const value = real[prop];
		if (typeof value === "function") {
			return value.bind(real) as Database[typeof prop];
		}
		return value;
	},
});
