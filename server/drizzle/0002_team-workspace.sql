CREATE TABLE `__new_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`actor_id` integer NOT NULL,
	`event` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "audit_event_check" CHECK(json_valid("event") AND json_extract("event", '$.type') IN ('created', 'updated', 'status_changed', 'deleted'))
);
--> statement-breakpoint
INSERT INTO `__new_audit_logs`("id", "task_id", "actor_id", "event", "created_at") SELECT "id", "task_id", "actor_id", json_object('type', 'status_changed', 'fromStatus', "from_status", 'toStatus', "to_status"), "created_at" FROM `audit_logs`;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
CREATE INDEX `audit_task_time_id_idx` ON `audit_logs` (`task_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT, 'Audit logs are immutable'); END;--> statement-breakpoint
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs BEGIN SELECT RAISE(ABORT, 'Audit logs are immutable'); END;--> statement-breakpoint
DROP INDEX `tasks_owner_deleted_idx`;--> statement-breakpoint
ALTER TABLE `tasks` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `assignee_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `updated_by_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE tasks SET updated_by_id = COALESCE((SELECT actor_id FROM audit_logs WHERE task_id = tasks.id ORDER BY created_at DESC, id DESC LIMIT 1), owner_id);--> statement-breakpoint
CREATE INDEX `tasks_deleted_updated_idx` ON `tasks` (`deleted_at`,`updated_at`);
