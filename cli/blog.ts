#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * The blog CLI, on result-rpc.
 *
 * These commands call the same procedures the dashboard calls, so
 * `blog update --publish` and a click on the dashboard switch are literally the
 * same code path. Bodies are edited with `blog edit`, which opens $EDITOR — a
 * better markdown editor than a browser textarea, and one that needs no draft
 * column to survive a reload.
 *
 * Failures stay tagged values the whole way. cli/failures.ts holds the single
 * exhaustive projection to English — the compiler enforces a handler per tag,
 * so adding an error to a contract breaks the build rather than degrading into
 * an unexplained exit code.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createTwoFilesPatch } from "diff";
import type { Result } from "result-rpc";
import * as v from "valibot";
import { createPostEtag, matchesPostEtag } from "../lib/post-etag";
import type { Temporal } from "temporal-polyfill";
import {
	CategorySlugSchema,
	LocaleSchema,
	NoteIdSchema,
	PostSlugSchema,
	PostTitleSchema,
} from "../src/blog/schemas";
import { clearToken, getValidToken, login } from "./auth";
import { editInEditor } from "./editor";
import { createDescribe } from "./failures";
import { API_BASE, createClient, type BlogClient } from "./client";

const ICLOUD_DOCUMENTS = `${process.env.HOME}/Library/Mobile Documents/com~apple~CloudDocs/Documents`;
const BACKUP_DIR = join(ICLOUD_DOCUMENTS, "blog-backup");

const { positionals, values } = parseArgs({
	allowPositionals: true,
	options: {
		slug: { type: "string", short: "s" },
		title: { type: "string", short: "t" },
		body: { type: "string", short: "b" },
		"body-file": { type: "string", short: "f" },
		category: { type: "string", short: "c" },
		locale: { type: "string", short: "l" },
		"hero-image": { type: "string" },
		"body-only": { type: "boolean" },
		"dry-run": { type: "boolean" },
		"if-match": { type: "string" },
		diff: { type: "boolean" },
		json: { type: "boolean" },
		publish: { type: "boolean" },
		unpublish: { type: "boolean" },
		description: { type: "string", short: "d" },
		help: { type: "boolean", short: "h" },
	},
});

const [command, ...args] = positionals;

function printHelp() {
	console.log(`
Blog CLI - Manage blog posts

Usage: bun run blog <command> [options]

API target:
  Every command talks to $BLOG_API_URL (default http://localhost:5173).
  \`bun run blog:prod\` targets the live site. \`whoami\` shows which one is
  in use; mutating commands print it with the result.

Revisions:
  Every write bumps the post's revision. \`get\` prints the current ETag
  (post-N) and \`get --json\` returns it with the post. Pass the ETag to
  \`update --if-match\` to abort if the post changed since you fetched it.
  Publish state is separate from content: \`update --publish|--unpublish\`
  flips it without touching the body.

Commands:
  login              Authenticate via browser
  logout             Clear stored authentication
  whoami             Show authenticated user and API target
  list               List all posts
  get <slug>         View post details
  edit <slug>        Open the post body in $EDITOR and save it back
  create             Create a new post
  update <slug>      Update an existing post
  delete <slug>      Delete a post
  categories         List available categories
  backup             Backup all posts to iCloud Documents

Note Commands:
  note list          List all notes
  note add <id>      Add a note
  note update <id>   Update a note
  note delete <id>   Delete a note

Options for note add/update:
  -d, --description  Description (markdown)
      --publish      Publish the note
      --unpublish    Unpublish the note

Options for create:
  -s, --slug         Post slug (required)
  -t, --title        Post title (required)
  -b, --body         Post body (markdown)
  -f, --body-file    Read body from file (use - for stdin)
  -c, --category     Category slug
  -l, --locale       Locale (en or is, default: en)
      --hero-image   Hero image URL
      --publish      Publish immediately (default: draft)
      --diff         Print the diff, then create
      --dry-run      Print the diff without creating anything

Options for get:
      --body-only    Print only the Markdown body
      --json         Print the post and its ETag as JSON

Options for edit:
      --diff         Print the diff, then save
      --dry-run      Print the diff without saving
      --publish      Also publish the post afterwards
      --unpublish    Also unpublish the post afterwards

Options for update:
  -t, --title        New title
  -b, --body         New body (markdown)
  -f, --body-file    Read body from file (use - for stdin)
  -c, --category     Category slug
  -l, --locale       Locale (en or is)
      --hero-image   Hero image URL
      --publish      Publish the post
      --unpublish    Unpublish the post
      --if-match     ETag from get --json; abort if the post changed
      --diff         Print the diff, then apply the update
      --dry-run      Print the diff without updating

Examples:
  bun run blog login
  bun run blog whoami
  bun run blog list
  bun run blog get my-post
  bun run blog get my-post --body-only > post.md
  bun run blog get my-post --json           # shows the ETag
  bun run blog create --slug my-post --title "My Post" --body "# Hello"
  bun run blog create --slug my-post --title "My Post" --body-file - --publish < post.md
  bun run blog update my-post --title "New Title"
  bun run blog update my-post --body-file post.md --if-match '"post-3"'
  bun run blog update my-post --publish     # publish an existing draft
  bun run blog edit my-post
  EDITOR="code -w" bun run blog edit my-post
  bun run blog delete my-post
`);
}

function die(message: string): never {
	console.error(message);
	process.exit(1);
}

/**
 * The exhaustive projection from tagged failure to message. See cli/failures.ts
 * — the compiler enforces that every tag in the contract has a handler, and
 * each handler sees its own `data` type.
 */
const describe = createDescribe(API_BASE);

/**
 * Unwrap a Result or exit with the described failure.
 *
 * This is the only place a failure stops being a value. Everything upstream —
 * the handler, the wire, the client — carries it as data with its payload
 * intact, which is why `describe` can say "you had revision 3, the server has
 * 5" instead of "412".
 */
function expect<T, E extends Parameters<typeof describe>[0]>(result: Result<T, E>): T {
	if (result.isErr()) die(describe(result.error));
	return result.value;
}

/** Validate one argv value against the schema the server enforces anyway. */
function check<TSchema extends v.GenericSchema>(
	schema: TSchema,
	value: unknown,
	label: string,
): v.InferOutput<TSchema> {
	const result = v.safeParse(schema, value);
	if (!result.success) {
		die(`${label}: ${result.issues.map((issue) => issue.message).join(", ")}`);
	}
	return result.output;
}

function readBodyInput(body: string | undefined, bodyFile: string | undefined): string | undefined {
	if (body !== undefined && bodyFile !== undefined) {
		die("Use either --body or --body-file, not both.");
	}
	if (bodyFile === undefined) return body;

	try {
		return readFileSync(bodyFile === "-" ? 0 : bodyFile, "utf-8");
	} catch {
		die(`Failed to read body from ${bodyFile === "-" ? "stdin" : bodyFile}`);
	}
}

function assertPublishOptionsAreCompatible() {
	if (values.publish && values.unpublish) {
		die("Use either --publish or --unpublish, not both.");
	}
}

type PostUpdate = {
	title?: string;
	markdown?: string;
	locale?: "en" | "is";
	categorySlug?: string | null;
	heroImage?: string | null;
	publish?: boolean;
};

type PostSnapshot = {
	title: string;
	markdown: string;
	locale: "en" | "is";
	categorySlug: string | null;
	heroImage: string | null;
	publicAt: Temporal.PlainDate | null;
};

const displayValue = (value: string | null) => value ?? "(none)";

function printCreateDiff(
	slug: string,
	post: {
		title: string;
		markdown: string;
		locale: string;
		categorySlug: string | null;
		heroImage: string | null;
	},
	publish: boolean,
) {
	console.log(`Create ${slug}`);
	console.log(`  Title: ${post.title}`);
	console.log(`  Status: ${publish ? "published" : "draft"}`);
	console.log(`  Locale: ${post.locale}`);
	console.log(`  Category: ${displayValue(post.categorySlug)}`);
	console.log(`  Hero image: ${displayValue(post.heroImage)}`);
	console.log("");
	process.stdout.write(
		createTwoFilesPatch("/dev/null", `${slug}.md`, "", post.markdown, "", "", { context: 3 }),
	);
}

function printUpdateDiff(
	slug: string,
	current: PostSnapshot,
	update: PostUpdate,
	shouldPrint: boolean,
): boolean {
	const metadataChanges: Array<[label: string, before: string, after: string]> = [];

	if (update.title !== undefined && update.title !== current.title) {
		metadataChanges.push(["Title", current.title, update.title]);
	}
	if (update.locale !== undefined && update.locale !== current.locale) {
		metadataChanges.push(["Locale", current.locale, update.locale]);
	}
	if (update.categorySlug !== undefined && update.categorySlug !== current.categorySlug) {
		metadataChanges.push([
			"Category",
			displayValue(current.categorySlug),
			displayValue(update.categorySlug),
		]);
	}
	if (update.heroImage !== undefined && update.heroImage !== current.heroImage) {
		metadataChanges.push([
			"Hero image",
			displayValue(current.heroImage),
			displayValue(update.heroImage),
		]);
	}
	if (update.publish !== undefined && update.publish !== (current.publicAt !== null)) {
		metadataChanges.push([
			"Status",
			current.publicAt === null ? "draft" : "published",
			update.publish ? "published" : "draft",
		]);
	}

	const markdownChanged = update.markdown !== undefined && update.markdown !== current.markdown;
	if (metadataChanges.length === 0 && !markdownChanged) {
		if (shouldPrint) console.log("No changes.");
		return false;
	}

	if (shouldPrint && metadataChanges.length > 0) {
		console.log("Metadata:");
		for (const [label, before, after] of metadataChanges) {
			console.log(`  ${label}: ${before} -> ${after}`);
		}
	}

	if (shouldPrint && markdownChanged) {
		if (metadataChanges.length > 0) console.log("");
		process.stdout.write(
			createTwoFilesPatch(
				`${slug}.md`,
				`${slug}.md`,
				current.markdown,
				update.markdown ?? "",
				"",
				"",
				{
					context: 3,
				},
			),
		);
	}

	return true;
}

function authed(): BlogClient {
	const token = getValidToken();
	if (!token) die("Not authenticated. Run 'bun run blog login' first.");
	return createClient(token);
}

async function handleLogin() {
	console.log("Starting authentication...");
	expect(await login());
	console.log("Successfully authenticated!");
}

function handleLogout() {
	clearToken();
	console.log("Logged out successfully.");
}

/**
 * Asks the blog, not GitHub.
 *
 * The stored credential is a signed CLI token, which GitHub never issued and
 * cannot validate — presenting it to api.github.com would report a 401 as
 * "Failed to reach GitHub".
 *
 * Asking the server is also the more useful question. What you want to know is
 * whether this CLI session still works against *this* deployment, and that is
 * precisely what the `session` procedure answers.
 */
async function handleWhoami() {
	if (!getValidToken()) die("Not authenticated. Run 'bun run blog login' first.");

	const viewer = expect(await authed().session({}));
	if (viewer === null) {
		die(`Session rejected by ${API_BASE}. Run 'bun run blog login' again.`);
	}

	console.log(
		`Logged in as ${viewer.username}${viewer.isAdmin ? " (admin)" : ""} at ${API_BASE}`,
	);
}

async function handleList() {
	const posts = expect(await authed().posts.list({}));

	console.log("\nPosts:");
	console.log("─".repeat(80));
	for (const post of posts) {
		const status = post.publicAt ? "published" : "draft";
		const date = post.publishedAt.toLocaleDateString();
		console.log(
			`[${status.padEnd(9)}] ${post.slug.padEnd(30)} ${post.title.slice(0, 30).padEnd(30)} ${date}`,
		);
	}
	console.log("─".repeat(80));
	console.log(`Total: ${posts.length} posts`);
}

async function handleGet(slug: string) {
	if (values["body-only"] && values.json) {
		die("Use either --body-only or --json, not both.");
	}

	const post = expect(await authed().posts.bySlug({ slug }));

	if (values["body-only"]) {
		process.stdout.write(post.markdown);
		return;
	}

	/**
	 * The ETag is a display format derived from `revision`, printed because
	 * `--if-match` accepts it. The concurrency check itself rides the wire as
	 * `expectedRevision`, not as a transport header.
	 */
	const etag = createPostEtag(post.revision);

	if (values.json) {
		console.log(JSON.stringify({ etag, post }, null, 2));
		return;
	}

	console.log(`
Title:      ${post.title}
Slug:       ${post.slug}
Status:     ${post.publicAt ? "Published" : "Draft"}
Locale:     ${post.locale}
Category:   ${post.categorySlug ?? "None"}
Hero Image: ${post.heroImage ?? "None"}
Created:    ${post.createdAt.toLocaleString()}
Published:  ${post.publishedAt.toLocaleString()}
Modified:   ${post.modifiedAt ? post.modifiedAt.toLocaleString() : "N/A"}
ETag:       ${etag}

─────────────────────────────────────────────────────────────────────────────────
${post.markdown}
`);
}

/**
 * `blog edit <slug>` — the way post bodies are edited.
 *
 * Fetch, open in $EDITOR, save what comes back. The revision read before the
 * editor opened is the one sent with the write, so a `blog update` or a
 * dashboard change that landed while the buffer was open is a
 * `post/stale-revision` rather than a silent overwrite — which matters more
 * here than anywhere else, because an editor session can stay open for an hour.
 */
async function handleEdit(slug: string) {
	assertPublishOptionsAreCompatible();

	const client = authed();
	const post = expect(await client.posts.bySlug({ slug }));

	const edited = expect(await editInEditor(slug, post.markdown));
	const changed = edited !== post.markdown;

	const publish = values.publish ? true : values.unpublish ? false : undefined;
	const willTogglePublish = publish !== undefined && publish !== (post.publicAt !== null);

	if (!changed && !willTogglePublish) {
		console.log("No changes.");
		return;
	}

	if ((values.diff ?? values["dry-run"]) && changed) {
		process.stdout.write(
			createTwoFilesPatch(`${slug}.md`, `${slug}.md`, post.markdown, edited, "", "", {
				context: 3,
			}),
		);
	}
	if (values["dry-run"]) return;

	let latest = post;
	if (changed) {
		latest = expect(
			await client.posts.update({
				slug,
				expectedRevision: post.revision,
				markdown: edited,
			}),
		);
	}

	if (willTogglePublish) {
		// `willTogglePublish` is only true when `publish` is defined, but the
		// compiler cannot see through the two-step derivation.
		latest = expect(await client.posts.setPublished({ slug, published: publish }));
	}

	console.log(`Post updated at ${API_BASE}: ${slug}`);
	console.log(`ETag: ${createPostEtag(latest.revision)}`);
}

async function handleCreate() {
	assertPublishOptionsAreCompatible();
	if (values.unpublish) die("--unpublish is not valid when creating a post.");
	if (!values.slug) die("Missing required option: --slug");
	if (!values.title) die("Missing required option: --title");

	const slug = check(PostSlugSchema, values.slug, "--slug");
	const title = check(PostTitleSchema, values.title, "--title");
	const locale =
		values.locale === undefined ? "en" : check(LocaleSchema, values.locale, "--locale");
	const categorySlug =
		values.category === undefined || values.category === ""
			? null
			: check(CategorySlugSchema, values.category, "--category");
	const shouldPublish = values.publish ?? false;
	const markdown = readBodyInput(values.body, values["body-file"]) ?? `# ${title}\n\n`;
	const heroImage = values["hero-image"] ?? null;

	if (values.diff || values["dry-run"]) {
		printCreateDiff(slug, { title, markdown, locale, categorySlug, heroImage }, shouldPublish);
	}
	if (values["dry-run"]) return;

	const post = expect(
		await authed().posts.create({
			slug,
			title,
			markdown,
			locale,
			categorySlug,
			heroImage,
			publish: shouldPublish,
		}),
	);

	console.log(
		`Post created at ${API_BASE}: ${post.slug} (${post.publicAt ? "published" : "draft"})`,
	);
	console.log(`ETag: ${createPostEtag(post.revision)}`);
}

async function handleUpdate(slug: string) {
	assertPublishOptionsAreCompatible();

	const update: PostUpdate = {};
	if (values.title !== undefined) update.title = check(PostTitleSchema, values.title, "--title");
	const body = readBodyInput(values.body, values["body-file"]);
	if (body !== undefined) update.markdown = body;
	if (values.locale !== undefined) update.locale = check(LocaleSchema, values.locale, "--locale");
	if (values.category !== undefined) {
		update.categorySlug =
			values.category === ""
				? null
				: check(CategorySlugSchema, values.category, "--category");
	}
	if (values["hero-image"] !== undefined) {
		update.heroImage = values["hero-image"] === "" ? null : values["hero-image"];
	}
	if (values.publish) update.publish = true;
	if (values.unpublish) update.publish = false;

	if (Object.keys(update).length === 0) {
		die("No updates specified. Use --help to see available options.");
	}

	const client = authed();
	const current = expect(await client.posts.bySlug({ slug }));
	const currentEtag = createPostEtag(current.revision);

	const requestedEtag = values["if-match"];
	if (requestedEtag && !matchesPostEtag(requestedEtag, currentEtag)) {
		console.error(`Post has changed (expected ${requestedEtag}, current ${currentEtag}).`);
		die("Fetch it again and reapply your changes.");
	}

	const shouldPrintDiff = Boolean(values.diff ?? values["dry-run"]);
	const hasChanges = printUpdateDiff(slug, current, update, shouldPrintDiff);
	if (!hasChanges && !shouldPrintDiff) console.log("No changes.");
	if (!hasChanges || values["dry-run"]) return;

	let latest = current;

	// Column writes and publishing are separate procedures on purpose:
	// publishing is not a column assignment, it promotes the draft and
	// re-extracts the hero image. The dashboard calls the same pair.
	const hasColumnChanges =
		update.title !== undefined ||
		update.markdown !== undefined ||
		update.locale !== undefined ||
		update.categorySlug !== undefined ||
		update.heroImage !== undefined;

	if (hasColumnChanges) {
		latest = expect(
			await client.posts.update({
				slug,
				expectedRevision: current.revision,
				title: update.title,
				markdown: update.markdown,
				locale: update.locale,
				categorySlug: update.categorySlug,
				heroImage: update.heroImage,
			}),
		);
	}

	if (update.publish !== undefined && update.publish !== (latest.publicAt !== null)) {
		latest = expect(await client.posts.setPublished({ slug, published: update.publish }));
	}

	console.log(`Post updated at ${API_BASE}: ${slug}`);
	console.log(`ETag: ${createPostEtag(latest.revision)}`);
}

async function handleDelete(slug: string) {
	expect(await authed().posts.remove({ slug }));
	console.log(`Post deleted at ${API_BASE}: ${slug}`);
}

async function handleCategories() {
	const categories = expect(await authed().categories.list({}));

	console.log("\nCategories:");
	console.log("─".repeat(40));
	for (const category of categories) {
		console.log(`${category.slug.padEnd(20)} ${category.label}`);
	}
	console.log("─".repeat(40));
	console.log(`Total: ${categories.length} categories`);
}

async function handleBackup() {
	if (!existsSync(ICLOUD_DOCUMENTS)) {
		console.error("iCloud Documents folder not found at:");
		console.error(ICLOUD_DOCUMENTS);
		die("\nMake sure iCloud Drive is enabled and Documents sync is on.");
	}

	console.log("Fetching posts...");
	// `posts.export` rather than `posts.list`: the list projection deliberately
	// leaves the bodies out, and a backup is exactly the case that wants them.
	const posts = expect(await authed().posts.export({}));

	if (posts.length === 0) {
		console.log("No posts to backup.");
		return;
	}

	const timestamp = new Date().toISOString().split("T")[0];
	const backupPath = join(BACKUP_DIR, timestamp);
	if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
	if (!existsSync(backupPath)) mkdirSync(backupPath, { recursive: true });

	console.log(`\nBacking up ${posts.length} posts to:`);
	console.log(backupPath);
	console.log("");

	for (const post of posts) {
		const frontmatter = [
			"---",
			`title: ${JSON.stringify(post.title)}`,
			`slug: ${JSON.stringify(post.slug)}`,
			`locale: ${post.locale}`,
			`status: ${post.publicAt ? "published" : "draft"}`,
			post.categorySlug ? `category: ${post.categorySlug}` : null,
			post.heroImage ? `heroImage: ${JSON.stringify(post.heroImage)}` : null,
			`createdAt: ${post.createdAt.toISOString()}`,
			`publishedAt: ${post.publishedAt.toISOString()}`,
			post.modifiedAt ? `modifiedAt: ${post.modifiedAt.toISOString()}` : null,
			"---",
		]
			.filter(Boolean)
			.join("\n");

		const filename = `${post.slug}.md`;
		writeFileSync(join(backupPath, filename), `${frontmatter}\n\n${post.markdown}`, "utf-8");
		console.log(`  ${filename}`);
	}

	console.log(`\nBackup complete: ${posts.length} posts saved.`);
}

async function handleNoteList() {
	const notes = expect(await authed().notes.list({}));

	console.log("\nNotes:");
	console.log("─".repeat(80));
	for (const note of notes) {
		const status = note.publishedAt ? "published" : "draft";
		console.log(
			`[${status.padEnd(9)}] ${note.id.padEnd(22)} ${(note.description ?? "").slice(0, 50)}`,
		);
	}
	console.log("─".repeat(80));
	console.log(`Total: ${notes.length} notes`);
}

async function handleNoteAdd(rawId: string) {
	assertPublishOptionsAreCompatible();
	const id = check(NoteIdSchema, rawId, "note id");

	expect(
		await authed().notes.create({
			id,
			description: values.description ?? null,
			publish: values.publish ?? false,
		}),
	);
	console.log(`Note added: ${id}`);
}

async function handleNoteUpdate(id: string) {
	assertPublishOptionsAreCompatible();

	const description = values.description;
	const publish = values.publish ? true : values.unpublish ? false : undefined;

	if (description === undefined && publish === undefined) {
		die("No updates specified. Use --help to see available options.");
	}

	expect(await authed().notes.update({ id, description, publish }));
	console.log(`Note updated: ${id}`);
}

async function handleNoteDelete(id: string) {
	expect(await authed().notes.remove({ id }));
	console.log(`Note deleted: ${id}`);
}

async function main() {
	if (values.help || !command) {
		printHelp();
		process.exit(0);
	}

	switch (command) {
		case "login":
			await handleLogin();
			break;
		case "logout":
			handleLogout();
			break;
		case "whoami":
			await handleWhoami();
			break;
		case "list":
			await handleList();
			break;
		case "get":
			if (!args[0]) die("Missing slug. Usage: bun run blog get <slug>");
			await handleGet(args[0]);
			break;
		case "edit":
			if (!args[0]) die("Missing slug. Usage: bun run blog edit <slug>");
			await handleEdit(args[0]);
			break;
		case "create":
			await handleCreate();
			break;
		case "update":
			if (!args[0]) die("Missing slug. Usage: bun run blog update <slug> [options]");
			await handleUpdate(args[0]);
			break;
		case "delete":
			if (!args[0]) die("Missing slug. Usage: bun run blog delete <slug>");
			await handleDelete(args[0]);
			break;
		case "categories":
			await handleCategories();
			break;
		case "backup":
			await handleBackup();
			break;
		case "note": {
			switch (args[0]) {
				case "list":
					await handleNoteList();
					break;
				case "add":
					if (!args[1]) die("Missing id. Usage: bun run blog note add <id> [options]");
					await handleNoteAdd(args[1]);
					break;
				case "update":
					if (!args[1]) die("Missing id. Usage: bun run blog note update <id> [options]");
					await handleNoteUpdate(args[1]);
					break;
				case "delete":
					if (!args[1]) die("Missing id. Usage: bun run blog note delete <id>");
					await handleNoteDelete(args[1]);
					break;
				default:
					console.error(`Unknown note command: ${args[0]}`);
					die("Available: list, add, update, delete");
			}
			break;
		}
		default:
			console.error(`Unknown command: ${command}`);
			printHelp();
			process.exit(1);
	}
}

main().catch((error: unknown) => {
	console.error("Error:", error);
	process.exit(1);
});
