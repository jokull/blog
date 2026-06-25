CREATE TABLE `post` (
	`title` text NOT NULL,
	`slug` text PRIMARY KEY NOT NULL,
	`markdown` text NOT NULL,
	`created_at` integer NOT NULL,
	`published_at` integer NOT NULL,
	`modified_at` integer
);
