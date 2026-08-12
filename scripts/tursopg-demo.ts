/**
 * tursopg experiment — the blog's data layer against Turso's Postgres frontend.
 *
 * Thesis: tursopg speaks the PostgreSQL wire protocol v3 (extended protocol
 * included), so the blog needs no forked kysely driver — Kysely's built-in
 * PostgresDialect + node-postgres replaces kysely-d1's D1Dialect. The "hybrid"
 * glue is two pg type-parser overrides and one plugin fix, not a driver fork.
 *
 * Type mapping (deliberate, not mechanical):
 *   D1 now                      tursopg
 *   is_hidden / is_published 0/1  BOOLEAN        — real booleans, not 0/1
 *   public_at YYYY-MM-DD TEXT     DATE           — calendar date, not text
 *   created_at/published_at/
 *   modified_at epoch INTEGER     TIMESTAMP      — no timezone (epoch is
 *                                                  tz-free; app renders in its
 *                                                  own tz). UTC wall clock.
 *   ids AUTOINCREMENT             BIGSERIAL
 *   github ids, revision          INTEGER
 *   everything else TEXT          TEXT
 *
 * The type-level decisions pay off because tursopg enforces them: DATE
 * rejects non-dates, TIMESTAMP rejects epoch numbers and garbage — the GLOB
 * CHECK on public_at and the epoch-seconds convention become type guarantees.
 *
 * Timestamp convention: tursopg normalizes ISO input to "YYYY-MM-DD HH:MM:SS"
 * (UTC wall clock when the app writes Date.toISOString()). Reads come back in
 * that form, so the TIMESTAMP parser override re-attaches the Z before
 * Date.parse — the instant is preserved exactly like epoch seconds were.
 *
 * The DB boundary type below is the deliverable: it is what the next
 * `db-types.generated.ts` looks like after the schema moves (Date for
 * TIMESTAMP columns, boolean for 0/1, Temporal.PlainDate for public_at).
 *
 * Migration changes this script exercises (all in-repo, no forks):
 *   1. lib/plain-date-plugin.ts: stringify insert-value cells (kysely 0.29
 *      packs them as raw values in PrimitiveValueListNode; D1's binding
 *      coerced PlainDate via toJSON(), a PG driver sends the JSON string),
 *      and map Date → Temporal.PlainDate on read — PG DATE columns arrive
 *      as a JS Date at UTC midnight, and the plugin (not a parser override)
 *      is the DATE boundary.
 *   2. orderBy("public_at", "desc") needs explicit nulls — PG DESC means
 *      NULLS FIRST, SQLite DESC means NULLS LAST; drafts must stay last:
 *      orderBy("public_at", (ob) => ob.desc().nullsLast()).
 *   3. db-result error classification: db-result/sqlite → db-result/pg
 *      (UniqueViolation/ForeignKeyViolation exist for pg), BUT tursopg emits
 *      SQLSTATE XX000 for every error — the pg classifiers match on codes
 *      23505/23503, so they never fire until tursopg grows proper SQLSTATEs.
 *   4. The boundary writes Date objects instead of epoch numbers.
 *   5. FK enforcement is OFF by default on tursopg (D1 has it on); the app
 *      must `SET foreign_keys = ON` once per connection.
 *
 * Runs against a tursopg server started with:
 *
 *   ~/Code/turso/target/release/tursopg /tmp/tursopg-blog.db --server 127.0.0.1:5433
 *
 *   TURSO_PG_URL=postgres://turso@127.0.0.1:5433/turso bun run scripts/tursopg-demo.ts
 *
 * The script is self-cleaning: deletes its own rows, leaves the tables for
 * poking.
 */
import { Kysely, PostgresDialect, sql, type Generated } from "kysely";
import { Pool, types } from "pg";
import { Temporal } from "temporal-polyfill";
import { plainDatePlugin } from "../lib/plain-date-plugin";
import type { OklchColor, ThemeColors } from "../src/kitty/colors";

// ---------------------------------------------------------------------------
// The tursopg boundary — what db-types.generated.ts becomes after the move
// ---------------------------------------------------------------------------

type TursopgDB = {
	category: {
		slug: string;
		label: string;
		created_at: Date;
	};
	post: {
		slug: string;
		title: string;
		markdown: string;
		preview_markdown: string | null;
		public_at: Temporal.PlainDate | null;
		created_at: Date;
		published_at: Date;
		modified_at: Date | null;
		revision: number;
		locale: "is" | "en";
		hero_image: string | null;
		category_slug: string | null;
	};
	comment: {
		id: Generated<number>;
		post_slug: string;
		author_github_id: number;
		author_github_username: string;
		author_avatar_url: string;
		content: string;
		is_hidden: boolean;
		created_at: Date;
	};
	note: {
		id: string;
		description: string | null;
		published_at: Date | null;
		created_at: Date;
	};
	kitty_theme: {
		id: Generated<number>;
		slug: string;
		name: string;
		author_github_id: number;
		author_github_username: string;
		author_avatar_url: string;
		is_published: boolean;
		forked_from_id: number | null;
		blurb: string | null;
		colors: string;
		created_at: Date;
		modified_at: Date | null;
	};
};

// ---------------------------------------------------------------------------
// Connection — the whole driver story in one place
// ---------------------------------------------------------------------------

// Required per the generated ProcessEnv (every wrangler var is), but the
// fallback is load-bearing for running outside the worker — same pattern as
// cli/client.ts.
// oxlint-disable-next-line typescript/no-unnecessary-condition
const url = process.env.TURSO_PG_URL ?? "postgres://turso@127.0.0.1:5433/turso";

// TIMESTAMP (1114): tursopg emits "YYYY-MM-DD HH:MM:SS" wall-clock UTC; pg's
// default parser reads tz-less timestamps as *local* time, which would shift
// the instant. Re-attach Z so the Date is the true instant.
types.setTypeParser(1114, (value) => new Date(Date.parse(`${value.replace(" ", "T")}Z`)));
// INT8 (20): node-postgres returns int8 as string; the blog's types demand
// numbers (COUNT(*) and any bigserial columns). Parse.
types.setTypeParser(20, (value) => parseInt(value, 10));
// DATE (1082) deliberately has NO override: pg hands the plugin a JS Date at
// UTC midnight and plainDatePlugin's Date arm rebuilds Temporal.PlainDate.

const pool = new Pool({ connectionString: url, max: 1 });

const rawDb = new Kysely<TursopgDB>({
	dialect: new PostgresDialect({ pool }),
}).withPlugin(plainDatePlugin(["public_at"]));

// ---------------------------------------------------------------------------
// Blog schema, translated from schema.ts with the deliberate type mapping
// ---------------------------------------------------------------------------

const DDL = [
	`CREATE TABLE category (
		slug TEXT PRIMARY KEY,
		label TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL
	)`,
	`CREATE TABLE post (
		slug TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		markdown TEXT NOT NULL,
		preview_markdown TEXT,
		public_at DATE,
		created_at TIMESTAMP NOT NULL,
		published_at TIMESTAMP NOT NULL,
		modified_at TIMESTAMP,
		revision INTEGER DEFAULT 1 NOT NULL,
		locale TEXT DEFAULT 'en' NOT NULL CHECK (locale IN ('is', 'en')),
		hero_image TEXT,
		category_slug TEXT REFERENCES category (slug)
	)`,
	`CREATE TABLE comment (
		id BIGSERIAL PRIMARY KEY,
		post_slug TEXT NOT NULL REFERENCES post (slug),
		author_github_id INTEGER NOT NULL,
		author_github_username TEXT NOT NULL,
		author_avatar_url TEXT NOT NULL,
		content TEXT NOT NULL,
		is_hidden BOOLEAN DEFAULT false NOT NULL,
		created_at TIMESTAMP NOT NULL
	)`,
	`CREATE TABLE note (
		id TEXT PRIMARY KEY,
		description TEXT,
		published_at TIMESTAMP,
		created_at TIMESTAMP NOT NULL
	)`,
	`CREATE TABLE kitty_theme (
		id BIGSERIAL PRIMARY KEY,
		slug TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		author_github_id INTEGER NOT NULL,
		author_github_username TEXT NOT NULL,
		author_avatar_url TEXT NOT NULL,
		is_published BOOLEAN DEFAULT false NOT NULL,
		forked_from_id INTEGER REFERENCES kitty_theme (id),
		blurb TEXT,
		colors TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL,
		modified_at TIMESTAMP
	)`,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Drafts fall back to published_at's calendar day, like the app's bylineDate. */
function bylineDate(publicAt: Temporal.PlainDate | null, publishedAt: Date): Temporal.PlainDate {
	return (
		publicAt ??
		Temporal.PlainDate.from({
			year: publishedAt.getUTCFullYear(),
			month: publishedAt.getUTCMonth() + 1,
			day: publishedAt.getUTCDate(),
		})
	);
}

function plainDateToIso(date: Temporal.PlainDate): string {
	return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function oklch(l: number, c: number, h: number): OklchColor {
	return { l, c, h };
}
function makeColors(seed: number): ThemeColors {
	return {
		color0: oklch(0.2 + seed * 0.01, 0.1, 0),
		color1: oklch(0.3 + seed * 0.01, 0.15, 20),
		color2: oklch(0.4 + seed * 0.01, 0.2, 40),
		color3: oklch(0.5 + seed * 0.01, 0.2, 60),
		color4: oklch(0.6 + seed * 0.01, 0.15, 80),
		color5: oklch(0.7 + seed * 0.01, 0.1, 100),
		color6: oklch(0.8 + seed * 0.01, 0.05, 120),
		color7: oklch(0.9 + seed * 0.01, 0.05, 140),
		color8: oklch(0.2 + seed * 0.02, 0.1, 160),
		color9: oklch(0.3 + seed * 0.02, 0.15, 180),
		color10: oklch(0.4 + seed * 0.02, 0.2, 200),
		color11: oklch(0.5 + seed * 0.02, 0.2, 220),
		color12: oklch(0.6 + seed * 0.02, 0.15, 240),
		color13: oklch(0.7 + seed * 0.02, 0.1, 260),
		color14: oklch(0.8 + seed * 0.02, 0.05, 280),
		color15: oklch(0.9 + seed * 0.02, 0.05, 300),
		foreground: oklch(0.95, 0.01, 0),
		background: oklch(0.15, 0.02, 0),
		cursor: oklch(0.95, 0.01, 0),
		selection_foreground: oklch(0.15, 0.02, 0),
		selection_background: oklch(0.6, 0.1, 240),
	};
}

const results: { label: string; ok: boolean; detail?: string }[] = [];
function check(label: string, ok: boolean, detail?: string): void {
	results.push({ label, ok, detail });
	console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function expectRejects(label: string, run: () => Promise<unknown>): Promise<void> {
	try {
		await run();
		check(label, false, "expected an error, got none");
	} catch {
		check(label, true);
	}
}

function slug(prefix: string): string {
	return `${prefix}-tursopg-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// The experiment
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const ddlClient = await pool.connect();
	try {
		// Children before parents so FK references never block the drops.
		await ddlClient.query(
			`DROP TABLE IF EXISTS kitty_theme; DROP TABLE IF EXISTS comment;
			 DROP TABLE IF EXISTS note; DROP TABLE IF EXISTS post; DROP TABLE IF EXISTS category;`,
		);
		for (const ddl of DDL) await ddlClient.query(ddl);
		// FK enforcement is OFF by default on tursopg (D1 has it on). SET is the
		// PRAGMA passthrough, and the server's single shared connection makes
		// the setting stick for every client — one SET at startup restores the
		// blog's D1 guarantees.
		await ddlClient.query("SET foreign_keys = ON");
		console.log(
			"DDL: blog schema created (BOOLEAN / DATE / TIMESTAMP / BIGSERIAL / TEXT) + foreign_keys = ON",
		);
	} finally {
		ddlClient.release();
	}

	// --- category: insert + list, with the app's returningAll -----------------
	const categorySlug = slug("cat");
	const createdCategory = await rawDb
		.insertInto("category")
		.values({ slug: categorySlug, label: "Tursopg experiment", created_at: new Date() })
		.returningAll()
		.executeTakeFirstOrThrow();
	check(
		"category: insert with returningAll() returns the stored row",
		createdCategory.slug === categorySlug && createdCategory.label === "Tursopg experiment",
		`slug=${createdCategory.slug}`,
	);
	const categories = await rawDb.selectFrom("category").selectAll().orderBy("label").execute();
	check(
		"category: selectAll() orderBy label returns the row",
		categories.some((c) => c.slug === categorySlug),
		`${categories.length} categories`,
	);

	// --- post: the plain-date boundary + DATE type ----------------------------
	const postSlug = slug("post");
	const draftSlug = slug("draft");
	const publishedDate = Temporal.PlainDate.from("2026-08-12");
	const now = new Date();
	await rawDb
		.insertInto("post")
		.values({
			slug: postSlug,
			title: "tursopg: the blog's data layer, moved",
			markdown:
				"# tursopg experiment\n\nRuns the blog's kysely queries against Turso's Postgres frontend.",
			public_at: publishedDate,
			created_at: now,
			published_at: now,
			revision: 1,
			locale: "en",
			category_slug: categorySlug,
		})
		.execute();
	await rawDb
		.insertInto("post")
		.values({
			slug: draftSlug,
			title: "Unpublished draft",
			markdown: "Not ready.",
			public_at: null,
			created_at: now,
			published_at: now,
			revision: 1,
			locale: "en",
			category_slug: null,
		})
		.execute();

	const stored = await rawDb
		.selectFrom("post")
		.selectAll()
		.where("slug", "=", postSlug)
		.executeTakeFirstOrThrow();
	check(
		"post: public_at read back as Temporal.PlainDate via plainDatePlugin (DATE column)",
		stored.public_at instanceof Temporal.PlainDate &&
			plainDateToIso(stored.public_at) === "2026-08-12",
		`instanceof=${stored.public_at instanceof Temporal.PlainDate}`,
	);
	check(
		"post: TIMESTAMP columns come back as Date with the true instant",
		stored.created_at instanceof Date &&
			Math.abs(stored.created_at.getTime() - now.getTime()) < 2000,
		`drift=${Math.abs(stored.created_at.getTime() - now.getTime())}ms`,
	);
	check(
		"post: bylineDate fold (public_at → PlainDate)",
		bylineDate(stored.public_at, stored.published_at).toString() === "2026-08-12",
	);
	const draft = await rawDb
		.selectFrom("post")
		.selectAll()
		.where("slug", "=", draftSlug)
		.executeTakeFirstOrThrow();
	check(
		"post: draft byline folds to published_at calendar day",
		draft.public_at === null &&
			bylineDate(draft.public_at, draft.published_at).toString() === "2026-08-12",
	);

	// --- type-level validation replaces the old string CHECK ------------------
	await expectRejects("post: DATE type rejects a non-date public_at (GLOB CHECK retired)", () =>
		rawDb
			.insertInto("post")
			.values({
				slug: slug("bad-date"),
				title: "bad",
				markdown: "bad",
				// Intentional: the boundary type says PlainDate, the probe
				// deliberately feeds a non-date to prove DATE rejects it.
				// oxlint-disable-next-line typescript/no-unsafe-type-assertion
				public_at: "2026-13-99" as unknown as Temporal.PlainDate,
				created_at: now,
				published_at: now,
				revision: 1,
				locale: "en",
				category_slug: null,
			})
			.execute(),
	);
	await expectRejects("post: TIMESTAMP type rejects epoch numbers (boundary must convert)", () =>
		rawDb
			.insertInto("post")
			.values({
				slug: slug("epoch"),
				title: "bad",
				markdown: "bad",
				public_at: null,
				// Intentional: proves TIMESTAMP rejects epoch numbers — the
				// boundary must convert, and the type enforces it.
				// oxlint-disable-next-line typescript/no-unsafe-type-assertion
				created_at: Math.floor(Date.now() / 1000) as unknown as Date,
				// oxlint-disable-next-line typescript/no-unsafe-type-assertion
				published_at: Math.floor(Date.now() / 1000) as unknown as Date,
				revision: 1,
				locale: "en",
				category_slug: null,
			})
			.execute(),
	);

	// --- NULLS ordering: tursopg keeps SQLite semantics here ------------------
	// The blog's exact expression. SQLite DESC puts NULLs last — and tursopg
	// inherits that, so the blog's query still surfaces drafts last on tursopg.
	// Real PostgreSQL means NULLS FIRST on DESC and would flip the order; the
	// explicit form below is the portable choice that works on both.
	const naiveOrder = await rawDb
		.selectFrom("post")
		.select("slug")
		.where("slug", "in", [postSlug, draftSlug])
		.orderBy("public_at", "desc")
		.execute();
	check(
		"post: tursopg keeps SQLite DESC ordering — drafts still sort last (diverges from real PG)",
		naiveOrder[0]?.slug === postSlug && naiveOrder[1]?.slug === draftSlug,
		`first=${naiveOrder[0]?.slug}`,
	);

	const fixedOrder = await rawDb
		.selectFrom("post")
		.select("slug")
		.where("slug", "in", [postSlug, draftSlug])
		.orderBy("public_at", (ob) => ob.desc().nullsLast())
		.execute();
	check(
		"post: explicit (ob) => ob.desc().nullsLast() — portable, drafts last",
		fixedOrder[0]?.slug === postSlug && fixedOrder[1]?.slug === draftSlug,
		`first=${fixedOrder[0]?.slug}`,
	);

	// --- comment: identity id + FK enforcement + BOOLEAN ----------------------
	const createdComment = await rawDb
		.insertInto("comment")
		.values({
			post_slug: postSlug,
			author_github_id: 424242,
			author_github_username: "tursopg-bot",
			author_avatar_url: "https://example.com/avatar.png",
			content: "The blog's data layer runs on Turso's Postgres frontend.",
			is_hidden: false,
			created_at: now,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	check(
		"comment: insert returns generated id via returningAll",
		typeof createdComment.id === "number" && createdComment.id > 0,
		`id=${String(createdComment.id)}`,
	);
	check(
		"comment: is_hidden round-trips as boolean",
		typeof createdComment.is_hidden === "boolean" && !createdComment.is_hidden,
		`typeof=${typeof createdComment.is_hidden}`,
	);
	await expectRejects("comment: FK enforcement — unknown post_slug rejected", () =>
		rawDb
			.insertInto("comment")
			.values({
				post_slug: "no-such-post",
				author_github_id: 1,
				author_github_username: "x",
				author_avatar_url: "https://example.com/a.png",
				content: "orphan",
				is_hidden: false,
				created_at: now,
			})
			.execute(),
	);

	// --- kitty_theme: JSON text colors + BOOLEAN filter -----------------------
	const themeColors = makeColors(7);
	const createdTheme = await rawDb
		.insertInto("kitty_theme")
		.values({
			slug: slug("theme"),
			name: "tursopg night",
			author_github_id: 424242,
			author_github_username: "tursopg-bot",
			author_avatar_url: "https://example.com/avatar.png",
			is_published: true,
			forked_from_id: null,
			blurb: "Proof the theme pipeline survives the move.",
			colors: JSON.stringify(themeColors),
			created_at: now,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	check("kitty_theme: insert returns generated id", typeof createdTheme.id === "number");
	// The app's published-themes query, with a real boolean filter.
	const themes = await rawDb
		.selectFrom("kitty_theme")
		.selectAll()
		.where("is_published", "=", true)
		.orderBy("created_at", "desc")
		.execute();
	check(
		"kitty_theme: published filter (is_published = true) + orderBy created_at desc",
		themes.some((t) => t.id === createdTheme.id),
		`${themes.length} published themes`,
	);
	check(
		"kitty_theme: colors JSON text round-trips (string compare, no codec drift)",
		JSON.stringify(JSON.parse(createdTheme.colors)) === JSON.stringify(themeColors),
	);
	// The app's toggle: `existing.is_published ? false : true` against the stored value.
	await rawDb
		.updateTable("kitty_theme")
		.set({ is_published: createdTheme.is_published ? false : true, modified_at: now })
		.where("id", "=", createdTheme.id)
		.execute();
	const toggled = await rawDb
		.selectFrom("kitty_theme")
		.select("is_published")
		.where("id", "=", createdTheme.id)
		.executeTakeFirstOrThrow();
	check("kitty_theme: boolean toggle update", !toggled.is_published);

	// --- note -----------------------------------------------------------------
	await rawDb
		.insertInto("note")
		.values({
			id: slug("note"),
			description: "A note on tursopg.",
			published_at: now,
			created_at: now,
		})
		.execute();
	const notes = await rawDb
		.selectFrom("note")
		.selectAll()
		.orderBy("created_at", "desc")
		.execute();
	check(
		"note: insert + list orderBy created_at desc",
		notes.length === 1 &&
			notes[0].description === "A note on tursopg." &&
			notes[0]?.published_at instanceof Date,
	);

	// --- update / count / delete ----------------------------------------------
	await rawDb
		.updateTable("post")
		.set({ title: "tursopg: the blog's data layer, moved (edited)", modified_at: now })
		.where("slug", "=", postSlug)
		.execute();
	const updated = await rawDb
		.selectFrom("post")
		.select("title")
		.where("slug", "=", postSlug)
		.executeTakeFirstOrThrow();
	check("post: updateTable set + where", updated.title.includes("(edited)"));

	const count = await rawDb
		.selectFrom("post")
		.select(({ fn }) => fn.countAll<number>().as("count"))
		.where("category_slug", "=", categorySlug)
		.executeTakeFirstOrThrow();
	check(
		"post: count(*) comes back as TEXT string on tursopg (app's Number() absorbs it)",
		typeof count.count === "string" && count.count === "1",
		`count=${String(count.count)} (${typeof count.count})`,
	);
	const countCast = await rawDb
		.selectFrom("post")
		.select(sql<number>`cast(count(*) as integer)`.as("count"))
		.where("category_slug", "=", categorySlug)
		.executeTakeFirstOrThrow();
	check(
		"post: cast(count(*) as integer) returns a real number (portable)",
		typeof countCast.count === "number" && countCast.count === 1,
		`count=${String(countCast.count)} (${typeof countCast.count})`,
	);

	// --- negative probe: the locale enum CHECK --------------------------------
	await expectRejects("post: locale CHECK rejects 'de' (drizzle enum -> IN check)", () =>
		rawDb
			.insertInto("post")
			.values({
				slug: slug("bad-locale"),
				title: "bad",
				markdown: "bad",
				public_at: null,
				created_at: now,
				published_at: now,
				revision: 1,
				// Intentional: proves the locale CHECK rejects non-enum values.
				// oxlint-disable-next-line typescript/no-unsafe-type-assertion
				locale: "de" as unknown as "en",
				category_slug: null,
			})
			.execute(),
	);

	// --- cleanup: self-cleaning, tables stay -----------------------------------
	// Children first: the comment references the post, and FK is now ON.
	await rawDb.deleteFrom("comment").where("id", "=", createdComment.id).execute();
	await rawDb.deleteFrom("post").where("slug", "in", [postSlug, draftSlug]).execute();
	await rawDb.deleteFrom("category").where("slug", "=", categorySlug).execute();
	await rawDb.deleteFrom("kitty_theme").where("id", "=", createdTheme.id).execute();
	await rawDb.deleteFrom("note").where("id", "=", notes[0]?.id).execute();
	console.log("cleanup: experiment rows deleted, tables left in place");
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
