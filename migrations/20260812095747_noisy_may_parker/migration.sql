PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- public_at was epoch seconds; the column is now a calendar date, so convert
-- existing values before the rebuild copies them. typeof-guarded: INTEGER
-- epochs become YYYY-MM-DD, already-text and NULL rows pass through untouched.
UPDATE `post` SET `public_at` = date(`public_at`, 'unixepoch')
WHERE `public_at` IS NOT NULL AND typeof(`public_at`) = 'integer';--> statement-breakpoint
CREATE TABLE `__new_post` (
	`slug` text PRIMARY KEY,
	`title` text NOT NULL,
	`markdown` text NOT NULL,
	`preview_markdown` text,
	`public_at` text,
	`created_at` integer NOT NULL,
	`published_at` integer NOT NULL,
	`modified_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`hero_image` text,
	`category_slug` text,
	CONSTRAINT `post_category_slug_category_slug_fk` FOREIGN KEY (`category_slug`) REFERENCES `category`(`slug`),
	CONSTRAINT "public_at_iso" CHECK("public_at" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
INSERT INTO `__new_post`(`slug`, `title`, `markdown`, `preview_markdown`, `public_at`, `created_at`, `published_at`, `modified_at`, `revision`, `locale`, `hero_image`, `category_slug`) SELECT `slug`, `title`, `markdown`, `preview_markdown`, `public_at`, `created_at`, `published_at`, `modified_at`, `revision`, `locale`, `hero_image`, `category_slug` FROM `post`;--> statement-breakpoint
DROP TABLE `post`;--> statement-breakpoint
ALTER TABLE `__new_post` RENAME TO `post`;--> statement-breakpoint
PRAGMA foreign_keys=ON;