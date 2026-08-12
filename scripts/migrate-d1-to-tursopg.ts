/**
 * Migrate the D1 SQLite data into the tursopg Postgres frontend, exercising
 * the sqlite→pg type transform end to end.
 *
 * Type mapping (mirrors the wire shapes the app now reads natively):
 *   - epoch INTEGER (seconds or ms) → TIMESTAMP "YYYY-MM-DD HH:MM:SS" UTC
 *   - INTEGER 0/1 (is_hidden, is_published) → BOOLEAN
 *   - TEXT "YYYY-MM-DD" (public_at) → DATE
 *   - everything else passes through
 *
 * Usage: bun run scripts/migrate-d1-to-tursopg.ts [path/to/d1.sqlite]
 * Default D1 path: the miniflare state file under .wrangler (dev-local D1).
 * Reads via the sqlite3 CLI (bun:sqlite cannot open this file — SQLITE_CANTOPEN),
 * writes through pg to $TURSO_PG_URL (default postgres://turso@127.0.0.1:5433/turso).
 * Idempotent: wipes target tables before inserting.
 */
import pg from "pg";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
function findD1Default(): string | undefined {
	try {
		return readdirSync(D1_DIR).find((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
	} catch {
		return undefined;
	}
}
const d1Path =
	process.argv[2] ??
	(() => {
		const f = findD1Default();
		return f ? path.join(D1_DIR, f) : undefined;
	})();
if (!d1Path) throw new Error("D1 sqlite not found — pass the path as argv[1]");
console.log("D1 source:", path.resolve(d1Path));

const pgUrl = process.env.TURSO_PG_URL || "postgres://turso@127.0.0.1:5433/turso";
const c = new pg.Client({ connectionString: pgUrl });
await c.connect();

const TABLES = ["category", "post", "note", "comment", "kitty_theme"] as const;

const isRow = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Read a whole table as JSON rows through the sqlite3 CLI. */
function readD1(table: string): Record<string, unknown>[] {
	const out = execFileSync("sqlite3", ["-json", d1Path, `SELECT * FROM ${table}`], {
		encoding: "utf8",
	}).trim();
	const parsed: unknown = out ? JSON.parse(out) : [];
	return Array.isArray(parsed) ? parsed.filter(isRow) : [];
}

const DATE_COLUMNS = new Set(["public_at"]);
const BOOLEAN_COLUMNS = new Set(["is_hidden", "is_published"]);

/** epoch (s or ms) → "YYYY-MM-DD HH:MM:SS" UTC, matching tursopg's TIMESTAMP wire shape. */
function toTimestamp(value: unknown): string | null {
	if (value === null) return null;
	const ms = Number(value) < 1e12 ? Number(value) * 1000 : Number(value);
	return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

function transform(row: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		if (value === null) {
			out[key] = null;
		} else if (DATE_COLUMNS.has(key)) {
			out[key] = value;
		} else if (BOOLEAN_COLUMNS.has(key)) {
			out[key] = Boolean(value);
		} else if (key.endsWith("_at")) {
			out[key] = toTimestamp(value);
		} else {
			out[key] = value;
		}
	}
	return out;
}

// Wipe child-first so FK constraints hold while the tables drain, then
// insert parent-first so references resolve on the way in.
const WIPE_ORDER = ["comment", "note", "kitty_theme", "post", "category"] as const;
for (const table of WIPE_ORDER) {
	await c.query(`DELETE FROM ${table}`);
}

for (const table of TABLES) {
	const rows = readD1(table).map(transform);
	if (rows.length === 0) {
		console.log(`${table}: 0 rows (empty)`);
		continue;
	}
	const columns = Object.keys(rows[0]);
	const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
	const insert = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
	for (const row of rows) {
		await c.query(
			insert,
			columns.map((col) => row[col]),
		);
	}
	console.log(`${table}: ${rows.length} rows inserted (${columns.length} columns)`);
}

const check = await c.query(
	"SELECT (SELECT count(*) FROM post) AS posts, (SELECT count(*) FROM category) AS categories, (SELECT count(*) FROM comment) AS comments, (SELECT count(*) FROM kitty_theme) AS themes",
);
console.log("tursopg totals:", JSON.stringify(check.rows[0]));
await c.end();
