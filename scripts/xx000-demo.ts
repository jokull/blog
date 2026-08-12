/**
 * xx000-demo — proves tursopg now emits real SQLSTATEs for constraint
 * failures, so db-result's `UniqueViolation.is` / `ForeignKeyViolation.is`
 * fire on the pg cutover (previously every error came back `code: "XX000"`
 * and both folded into the generic path).
 *
 * Mirrors `db.ts`'s wrapping exactly — `kyselyTryDb` around a `PostgresDialect`
 * Kysely — and asserts the two acceptance cases:
 *   (a) duplicate key   -> UniqueViolation.is(err) === true   (23505)
 *   (b) FK violation    -> ForeignKeyViolation.is(err) === true (23503)
 *
 * The `.is()` assertion is load-bearing proof of the SQLSTATE fix, not
 * message matching: db-result only reaches the message classifier when the
 * error carries NO SQLSTATE code — but tursopg's XX000 always short-circuits
 * there. FK is the sharper probe: tursopg's FK message is
 * "immediate foreign key constraint failed", which matches none of
 * db-result's message regexes, so only the 23503 code classifies it.
 *
 * Run against a tursopg server with the SQLSTATE fix:
 *
 *   TURSO_PG_URL=postgres://turso@127.0.0.1:5434/turso bun run scripts/xx000-demo.ts
 */
import { Kysely, PostgresDialect, type Generated } from "kysely";
import { Pool, types } from "pg";
import { kyselyTryDb } from "db-result/kysely";
import { UniqueViolation, ForeignKeyViolation } from "db-result";
import type { SqliteDbError } from "db-result/sqlite";

// oxlint-disable-next-line typescript/no-unnecessary-condition
const url = process.env.TURSO_PG_URL ?? "postgres://turso@127.0.0.1:5433/turso";

// INT8 (20): bigserial ids come back as strings; the app boundary wants
// numbers. Matches db.ts's parser overrides.
types.setTypeParser(20, (value) => parseInt(value, 10));

type DemoDB = {
	parent: { id: Generated<number>; name: string };
	child: { id: Generated<number>; parent_id: number };
};

const pool = new Pool({ connectionString: url, max: 1 });
// FK enforcement is OFF by default on tursopg (D1 has it on) — one SET per
// connection, like real PG and like db.ts does.
pool.on("connect", (client) => {
	void client.query("SET foreign_keys = ON");
});

const rawDb = new Kysely<DemoDB>({
	dialect: new PostgresDialect({ pool }),
});

// The exact wrap db.ts uses: db-result/sqlite's error ledger.
const db = kyselyTryDb<typeof rawDb, SqliteDbError>(rawDb);

const results: { label: string; ok: boolean; detail?: string }[] = [];
const check = (label: string, ok: boolean, detail?: string): void => {
	results.push({ label, ok, detail });
	console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

const tagOf = (e: unknown): string => {
	if (typeof e === "object" && e !== null && "_tag" in e) {
		const tag = e._tag;
		return typeof tag === "string" ? tag : String(tag);
	}
	return "n/a";
};

async function main(): Promise<void> {
	const ddlClient = await pool.connect();
	try {
		await ddlClient.query(
			`DROP TABLE IF EXISTS child; DROP TABLE IF EXISTS parent;
			 CREATE TABLE parent (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE);
			 CREATE TABLE child (id BIGSERIAL PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES parent(id));`,
		);
	} finally {
		ddlClient.release();
	}

	// Seed a parent row so the duplicate and the FK probe both have a target.
	const seed = await db.insertInto("parent").values({ name: "taken" }).execute();
	check("seed: parent row inserted", seed.isOk());

	// --- (a) duplicate key -------------------------------------------------
	const dup = await db.insertInto("parent").values({ name: "taken" }).execute();
	const dupErr = dup.isErr() ? dup.error : null;
	check(
		"duplicate key -> UniqueViolation.is(err) === true",
		dupErr !== null && UniqueViolation.is(dupErr),
		`tag=${tagOf(dupErr)}`,
	);

	// --- (b) foreign key ---------------------------------------------------
	const fk = await db.insertInto("child").values({ parent_id: 999_999 }).execute();
	const fkErr = fk.isErr() ? fk.error : null;
	check(
		"FK violation -> ForeignKeyViolation.is(err) === true",
		fkErr !== null && ForeignKeyViolation.is(fkErr),
		`tag=${tagOf(fkErr)}`,
	);
}

main()
	.then(() => {
		const failed = results.filter((r) => !r.ok);
		console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
		if (failed.length > 0) {
			console.error(`FAILED: ${failed.map((f) => f.label).join("; ")}`);
			process.exit(1);
		}
	})
	.finally(() => void rawDb.destroy())
	.catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	});
