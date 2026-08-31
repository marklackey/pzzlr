-- hard_mode stops being a boolean on a game and becomes a three-way policy
-- (see HardModePolicy in $lib/types), with the resolved yes/no for one
-- player's attempt moving onto puzzle_attempt. A game that had it on
-- required it of everyone, so that is what it becomes.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_puzzle_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`date` text NOT NULL,
	`token` text NOT NULL,
	`guesses` text DEFAULT '[]' NOT NULL,
	`config` text,
	`hard_mode` integer DEFAULT false NOT NULL,
	`solved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `game_config`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- No hard_mode on the old attempts: they were all played under a boolean
-- game setting, and false is what a game whose policy is now 'forbidden'
-- (see below) means for an attempt.
INSERT INTO `__new_puzzle_attempt`("id", "game_id", "date", "token", "guesses", "config", "hard_mode", "solved", "created_at") SELECT "id", "game_id", "date", "token", "guesses", "config", false, "solved", "created_at" FROM `puzzle_attempt`;--> statement-breakpoint
DROP TABLE `puzzle_attempt`;--> statement-breakpoint
ALTER TABLE `__new_puzzle_attempt` RENAME TO `puzzle_attempt`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `puzzle_attempt_game_date_token_idx` ON `puzzle_attempt` (`game_id`,`date`,`token`);--> statement-breakpoint
CREATE TABLE `__new_game_config` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`mode` text DEFAULT 'ladder' NOT NULL,
	`target` text,
	`length` integer NOT NULL,
	`dictionary_size` integer DEFAULT 80 NOT NULL,
	`min_steps` integer DEFAULT 4 NOT NULL,
	`rungs_given` integer DEFAULT 0 NOT NULL,
	`max_guesses` integer DEFAULT 6 NOT NULL,
	`hard_mode` text DEFAULT 'forbidden' NOT NULL,
	`board_count` integer DEFAULT 4 NOT NULL,
	`owner_id` text,
	`public` integer DEFAULT true NOT NULL,
	`embed_key_id` text,
	`embed_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_game_config`("id", "name", "mode", "target", "length", "dictionary_size", "min_steps", "rungs_given", "max_guesses", "hard_mode", "board_count", "owner_id", "public", "embed_key_id", "embed_key", "created_at") SELECT "id", "name", "mode", "target", "length", "dictionary_size", "min_steps", "rungs_given", "max_guesses", CASE WHEN "hard_mode" = 1 THEN 'required' ELSE 'forbidden' END, "board_count", "owner_id", "public", "embed_key_id", "embed_key", "created_at" FROM `game_config`;--> statement-breakpoint
DROP TABLE `game_config`;--> statement-breakpoint
ALTER TABLE `__new_game_config` RENAME TO `game_config`;