CREATE TABLE `kitty_theme` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`author_github_id` integer NOT NULL,
	`author_github_username` text NOT NULL,
	`author_avatar_url` text NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`forked_from_id` integer,
	`blurb` text,
	`colors` text NOT NULL,
	`created_at` integer NOT NULL,
	`modified_at` integer,
	FOREIGN KEY (`forked_from_id`) REFERENCES `kitty_theme`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kitty_theme_slug_unique` ON `kitty_theme` (`slug`);