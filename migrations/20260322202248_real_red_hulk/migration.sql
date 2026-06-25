CREATE TABLE `note` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`source_url` text,
	`source_author` text,
	`published_at` integer,
	`created_at` integer NOT NULL
);
