CREATE TABLE `favorite` (
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `game_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `game_config`(`id`) ON UPDATE no action ON DELETE cascade
);
