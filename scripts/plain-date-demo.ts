/**
 * The wire journey, end to end, on the real column.
 *
 * post.public_at is CHECK-constrained YYYY-MM-DD TEXT in D1 (see
 * migrations/..._noisy_may_parker/migration.sql). The plain-date plugin
 * marshals it to Temporal.PlainDate at the query boundary; result-rpc's
 * The wire date codec (wire.plainDate) carries it as a first-class value;
 * the client receives the fancy type.
 *
 * The loop is self-cleaning: it creates a scratch draft, publishes it (which
 * WRITES a Temporal.PlainDate through the plugin), re-reads it across the
 * wire, asserts the client received a real Temporal.PlainDate, then deletes
 * it. Storage staying TEXT is enforced by the GLOB CHECK — a write that had
 * not been stringified would fail the constraint.
 *
 * Run with the dev server up:
 *   dotenvx run -f .env -- bun run scripts/plain-date-demo.ts
 */
import { Temporal } from "temporal-polyfill";
import type { Result } from "better-result";
import { createBrowserClient, fetchTransport } from "result-rpc/client";
import { appContract } from "../src/rpc/contract";

function toHex(buf: ArrayBuffer): string {
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** Mint a CLI token exactly as lib/cli-token.ts does — same payload, same key. */
async function mintCliToken(username: string): Promise<string> {
	const payload = JSON.stringify({ sub: username, iat: Math.floor(Date.now() / 1000) });
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(process.env.GITHUB_CLIENT_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
	return `${btoa(payload)}.${toHex(signature)}`;
}

const client = createBrowserClient({
	contract: appContract,
	transport: fetchTransport({
		url: "http://localhost:5173/api/rpc",
		headers: { Authorization: `Bearer ${await mintCliToken("jokull")}` },
	}),
});

const slug = `plain-date-demo-${Date.now().toString(36)}`;

/** Fold the procedure result: return the value, or print and exit. */
async function unwrap<T>(call: Promise<Result<T, unknown>>, label: string): Promise<T> {
	const result = await call;
	return result.match({
		ok: (value) => value,
		err: (error) => {
			console.error(`${label} failed:`, error);
			process.exit(1);
		},
	});
}

try {
	// 1. Create a scratch draft: public_at is null.
	await unwrap(
		client.posts.create({
			slug,
			title: "PlainDate demo",
			markdown: "# PlainDate demo",
			locale: "en",
			categorySlug: null,
			heroImage: null,
			publish: false,
		}),
		"create",
	);

	// 2. Publish: the handler writes Temporal.Now.plainDateISO() (a
	//    Temporal.PlainDate); the plugin stringifies it into storage.
	await unwrap(client.posts.setPublished({ slug, published: true }), "setPublished");

	// 3. Re-read across the wire as a fresh client-side value.
	const rows = await unwrap(client.posts.list({}), "posts.list");
	const row = rows.find((r) => r.slug === slug);
	if (!row) {
		console.error(`row ${slug} missing after list`);
		process.exit(1);
	}

	const received = row.publicAt;
	if (!(received instanceof Temporal.PlainDate)) {
		console.error("FAIL: the client received a string, not a Temporal.PlainDate");
		process.exit(1);
	}
	console.log("wire round-trip for post.public_at:");
	console.log(`  instanceof Temporal.PlainDate: ${received instanceof Temporal.PlainDate}`);
	console.log(`  value: ${received.toString()}`);

	const expected = Temporal.Now.plainDateISO().toString();
	if (received.toString() !== expected) {
		console.error(`FAIL: expected today (${expected}), received ${received.toString()}`);
		process.exit(1);
	}
	console.log(`OK — Temporal.PlainDate came all the way across the wire (${expected}).`);
} finally {
	await unwrap(client.posts.remove({ slug }), "remove");
	console.log("scratch post removed.");
}
