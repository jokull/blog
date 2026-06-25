CREATE TABLE `comment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_slug` text NOT NULL,
	`author_github_id` integer NOT NULL,
	`author_github_username` text NOT NULL,
	`author_avatar_url` text NOT NULL,
	`content` text NOT NULL,
	`is_hidden` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_slug`) REFERENCES `post`(`slug`) ON UPDATE no action ON DELETE no action
);
