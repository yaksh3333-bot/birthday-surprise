CREATE TABLE `birthday_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`url` text NOT NULL,
	`caption` varchar(255) NOT NULL DEFAULT 'A favorite memory',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `birthday_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `birthday_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`recipientName` varchar(160) NOT NULL DEFAULT 'Big Sis',
	`welcomeMessage` text,
	`letterMessage` text,
	`signoff` varchar(160) NOT NULL DEFAULT 'Your family',
	`heroImageUrl` text,
	`videoUrl` text,
	`musicUrl` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `birthday_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `birthday_pages_slug_unique` UNIQUE(`slug`)
);
