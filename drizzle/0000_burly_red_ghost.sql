CREATE TABLE `timers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`accent` text DEFAULT 'green' NOT NULL,
	`target_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_timers_owner_target` ON `timers` (`owner_id`,`target_at`);