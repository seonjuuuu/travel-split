CREATE TABLE `expenses` (
	`id` varchar(36) NOT NULL,
	`projectId` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`amount` float NOT NULL,
	`category` enum('식비','교통','숙박','관광','쇼핑','기타') NOT NULL DEFAULT '기타',
	`payerId` varchar(36) NOT NULL,
	`participantIds` text NOT NULL DEFAULT ('[]'),
	`date` varchar(10) NOT NULL DEFAULT '',
	`isPreTrip` boolean NOT NULL DEFAULT false,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` varchar(36) NOT NULL,
	`projectId` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`isMe` boolean NOT NULL DEFAULT false,
	`color` varchar(20) NOT NULL DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travel_projects` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`destination` varchar(100) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`myName` varchar(50) NOT NULL DEFAULT '나',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `travel_projects_id` PRIMARY KEY(`id`)
);
