CREATE TABLE `category` (
	`slug` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `post` ADD `category_slug` text REFERENCES category(slug);