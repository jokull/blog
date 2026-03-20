#!/usr/bin/env bun
/* eslint-disable no-console */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { safeFetchJson, safeZodParse } from "../lib/safe-utils";
import { clearToken, getValidToken, login } from "./auth";
import { API_BASE, createClient } from "./client";

function parseLocale(value: string | undefined): "en" | "is" | undefined {
	if (value === "en" || value === "is") return value;
	return undefined;
}

const ICLOUD_DOCUMENTS = `${process.env.HOME}/Library/Mobile Documents/com~apple~CloudDocs/Documents`;
const BACKUP_DIR = join(ICLOUD_DOCUMENTS, "blog-backup");

// Parse command line arguments
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
		publish: { type: "boolean" },
		unpublish: { type: "boolean" },
		help: { type: "boolean", short: "h" },
	},
});

const [command, ...args] = positionals;

function printHelp() {
	console.log(`
Blog CLI - Manage blog posts

Usage: bun run blog <command> [options]

Commands:
  login              Authenticate via browser
  logout             Clear stored authentication
  whoami             Show authenticated user
  list               List all posts
  get <slug>         View post details
  create             Create a new post
  update <slug>      Update an existing post
  delete <slug>      Delete a post
  categories         List available categories
  backup             Backup all posts to iCloud Documents

Options for create:
  -s, --slug         Post slug (required)
  -t, --title        Post title (required)
  -b, --body         Post body (markdown)
  -f, --body-file    Read body from file
  -c, --category     Category slug
  -l, --locale       Locale (en or is, default: en)
      --hero-image   Hero image URL

Options for update:
  -t, --title        New title
  -b, --body         New body (markdown)
  -f, --body-file    Read body from file
  -c, --category     Category slug
  -l, --locale       Locale (en or is)
      --hero-image   Hero image URL
      --publish      Publish the post
      --unpublish    Unpublish the post

Examples:
  bun run blog login
  bun run blog list
  bun run blog get my-post
  bun run blog create --slug my-post --title "My Post" --body "# Hello"
  bun run blog create --slug my-post --title "My Post" --body-file ./post.md
  bun run blog update my-post --publish
  bun run blog update my-post --title "New Title"
  bun run blog delete my-post
`);
}

async function requireAuth(): Promise<string> {
	const token = await getValidToken(API_BASE);
	if (!token) {
		console.error("Not authenticated. Run 'bun run blog login' first.");
		process.exit(1);
	}
	return token;
}

async function handleLogin() {
	console.log("Starting authentication...");
	try {
		await login(API_BASE);
		console.log("Successfully authenticated!");
	} catch (error) {
		console.error("Login failed:", error);
		process.exit(1);
	}
}

function handleLogout() {
	clearToken();
	console.log("Logged out successfully.");
}

const githubUserSchema = z.object({
	login: z.string(),
	name: z.string().nullable(),
});

async function handleWhoami() {
	const token = await requireAuth();
	const result = await safeFetchJson("https://api.github.com/user", {
		headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
	});
	const user = result.andThen(safeZodParse(githubUserSchema)).unwrap("Failed to fetch user");
	console.log(`Logged in as ${user.login}${user.name ? ` (${user.name})` : ""}`);
}

async function handleList() {
	const token = await requireAuth();
	const client = createClient(token);

	const res = await client.api.posts.$get();
	if (!res.ok) {
		console.error("Failed to fetch posts:", res.status);
		process.exit(1);
	}

	const data = await res.json();
	if ("error" in data) {
		console.error("Error:", data.error);
		process.exit(1);
	}

	console.log("\nPosts:");
	console.log("─".repeat(80));

	for (const post of data.posts) {
		const status = post.publicAt ? "published" : "draft";
		const date = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "N/A";
		console.log(
			`[${status.padEnd(9)}] ${post.slug.padEnd(30)} ${post.title.slice(0, 30).padEnd(30)} ${date}`,
		);
	}

	console.log("─".repeat(80));
	console.log(`Total: ${data.posts.length} posts`);
}

async function handleGet(slug: string) {
	const token = await requireAuth();
	const client = createClient(token);

	const res = await client.api.posts[":slug"].$get({
		param: { slug },
	});

	if (!res.ok) {
		if (res.status === 404) {
			console.error(`Post not found: ${slug}`);
		} else {
			console.error("Failed to fetch post:", res.status);
		}
		process.exit(1);
	}

	const data = await res.json();
	if ("error" in data) {
		console.error("Error:", data.error);
		process.exit(1);
	}

	const post = data.post;
	console.log(`
Title:      ${post.title}
Slug:       ${post.slug}
Status:     ${post.publicAt ? "Published" : "Draft"}
Locale:     ${post.locale}
Category:   ${post.categorySlug ?? "None"}
Hero Image: ${post.heroImage ?? "None"}
Created:    ${post.createdAt ? new Date(post.createdAt).toLocaleString() : "N/A"}
Published:  ${post.publishedAt ? new Date(post.publishedAt).toLocaleString() : "N/A"}
Modified:   ${post.modifiedAt ? new Date(post.modifiedAt).toLocaleString() : "N/A"}

─────────────────────────────────────────────────────────────────────────────────
${post.markdown}
`);
}

async function handleCreate() {
	const token = await requireAuth();
	const client = createClient(token);

	const slug = values.slug;
	const title = values.title;
	let body = values.body;
	const bodyFile = values["body-file"];
	const category = values.category;
	const locale = parseLocale(values.locale);
	const heroImage = values["hero-image"];

	if (!slug) {
		console.error("Missing required option: --slug");
		process.exit(1);
	}
	if (!title) {
		console.error("Missing required option: --title");
		process.exit(1);
	}

	if (bodyFile) {
		try {
			body = readFileSync(bodyFile, "utf-8");
		} catch {
			console.error(`Failed to read file: ${bodyFile}`);
			process.exit(1);
		}
	}

	body ??= `# ${title}\n\n`;

	const res = await client.api.posts.$post({
		json: {
			slug,
			title,
			markdown: body,
			locale: locale ?? "en",
			categorySlug: category ?? null,
			heroImage: heroImage ?? null,
		},
	});

	if (!res.ok) {
		console.error("Failed to create post:", res.status);
		const data = await res.json();
		if ("error" in data) {
			console.error("Error:", data.error);
		}
		process.exit(1);
	}

	console.log(`Post created: ${slug}`);
}

async function handleUpdate(slug: string) {
	const token = await requireAuth();
	const client = createClient(token);

	const title = values.title;
	let body = values.body;
	const bodyFile = values["body-file"];
	const category = values.category;
	const locale = parseLocale(values.locale);
	const heroImage = values["hero-image"];
	const shouldPublish = values.publish;
	const shouldUnpublish = values.unpublish;

	if (bodyFile) {
		try {
			body = readFileSync(bodyFile, "utf-8");
		} catch {
			console.error(`Failed to read file: ${bodyFile}`);
			process.exit(1);
		}
	}

	const updateData: {
		title?: string;
		markdown?: string;
		locale?: "en" | "is";
		categorySlug?: string | null;
		heroImage?: string | null;
		publish?: boolean;
	} = {};

	if (title !== undefined) updateData.title = title;
	if (body !== undefined) updateData.markdown = body;
	if (locale !== undefined) updateData.locale = locale;
	if (category !== undefined) updateData.categorySlug = category || null;
	if (heroImage !== undefined) updateData.heroImage = heroImage || null;
	if (shouldPublish) updateData.publish = true;
	if (shouldUnpublish) updateData.publish = false;

	if (Object.keys(updateData).length === 0) {
		console.error("No updates specified. Use --help to see available options.");
		process.exit(1);
	}

	const res = await client.api.posts[":slug"].$patch({
		param: { slug },
		json: updateData,
	});

	if (!res.ok) {
		console.error("Failed to update post:", res.status);
		const data = await res.json();
		if ("error" in data) {
			console.error("Error:", data.error);
		}
		process.exit(1);
	}

	console.log(`Post updated: ${slug}`);
}

async function handleDelete(slug: string) {
	const token = await requireAuth();
	const client = createClient(token);

	const res = await client.api.posts[":slug"].$delete({
		param: { slug },
	});

	if (!res.ok) {
		console.error("Failed to delete post:", res.status);
		const data = await res.json();
		if ("error" in data) {
			console.error("Error:", data.error);
		}
		process.exit(1);
	}

	console.log(`Post deleted: ${slug}`);
}

async function handleCategories() {
	const token = await requireAuth();
	const client = createClient(token);

	const res = await client.api.categories.$get();
	if (!res.ok) {
		console.error("Failed to fetch categories:", res.status);
		process.exit(1);
	}

	const data = await res.json();
	if ("error" in data) {
		console.error("Error:", data.error);
		process.exit(1);
	}

	console.log("\nCategories:");
	console.log("─".repeat(40));

	for (const category of data.categories) {
		console.log(`${category.slug.padEnd(20)} ${category.label}`);
	}

	console.log("─".repeat(40));
	console.log(`Total: ${data.categories.length} categories`);
}

async function handleBackup() {
	// Check if iCloud Documents folder exists
	if (!existsSync(ICLOUD_DOCUMENTS)) {
		console.error("iCloud Documents folder not found at:");
		console.error(ICLOUD_DOCUMENTS);
		console.error("\nMake sure iCloud Drive is enabled and Documents sync is on.");
		process.exit(1);
	}

	const token = await requireAuth();
	const client = createClient(token);

	console.log("Fetching posts...");

	const res = await client.api.posts.$get();
	if (!res.ok) {
		console.error("Failed to fetch posts:", res.status);
		process.exit(1);
	}

	const data = await res.json();
	if ("error" in data) {
		console.error("Error:", data.error);
		process.exit(1);
	}

	const posts = data.posts;
	if (posts.length === 0) {
		console.log("No posts to backup.");
		return;
	}

	// Create timestamped backup folder
	const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
	const backupPath = join(BACKUP_DIR, timestamp);

	if (!existsSync(BACKUP_DIR)) {
		mkdirSync(BACKUP_DIR, { recursive: true });
	}
	if (!existsSync(backupPath)) {
		mkdirSync(backupPath, { recursive: true });
	}

	console.log(`\nBacking up ${posts.length} posts to:`);
	console.log(backupPath);
	console.log("");

	for (const post of posts) {
		// Create YAML frontmatter
		const frontmatter = [
			"---",
			`title: ${JSON.stringify(post.title)}`,
			`slug: ${JSON.stringify(post.slug)}`,
			`locale: ${post.locale}`,
			`status: ${post.publicAt ? "published" : "draft"}`,
			post.categorySlug ? `category: ${post.categorySlug}` : null,
			post.heroImage ? `heroImage: ${JSON.stringify(post.heroImage)}` : null,
			post.createdAt ? `createdAt: ${new Date(post.createdAt).toISOString()}` : null,
			post.publishedAt ? `publishedAt: ${new Date(post.publishedAt).toISOString()}` : null,
			post.modifiedAt ? `modifiedAt: ${new Date(post.modifiedAt).toISOString()}` : null,
			"---",
		]
			.filter(Boolean)
			.join("\n");

		const content = `${frontmatter}\n\n${post.markdown}`;
		const filename = `${post.slug}.md`;
		const filepath = join(backupPath, filename);

		writeFileSync(filepath, content, "utf-8");
		console.log(`  ${filename}`);
	}

	console.log(`\nBackup complete: ${posts.length} posts saved.`);
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
			if (!args[0]) {
				console.error("Missing slug. Usage: bun run blog get <slug>");
				process.exit(1);
			}
			await handleGet(args[0]);
			break;
		case "create":
			await handleCreate();
			break;
		case "update":
			if (!args[0]) {
				console.error("Missing slug. Usage: bun run blog update <slug> [options]");
				process.exit(1);
			}
			await handleUpdate(args[0]);
			break;
		case "delete":
			if (!args[0]) {
				console.error("Missing slug. Usage: bun run blog delete <slug>");
				process.exit(1);
			}
			await handleDelete(args[0]);
			break;
		case "categories":
			await handleCategories();
			break;
		case "backup":
			await handleBackup();
			break;
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
