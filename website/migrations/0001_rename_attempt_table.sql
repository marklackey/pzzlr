ALTER TABLE `wordle_attempt` RENAME TO `puzzle_attempt`;--> statement-breakpoint
DROP INDEX IF EXISTS `wordle_attempt_game_date_token_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `puzzle_attempt_game_date_token_idx` ON `puzzle_attempt` (`game_id`,`date`,`token`);