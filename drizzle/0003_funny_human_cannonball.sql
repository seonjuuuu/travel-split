ALTER TABLE "travel_projects" ADD COLUMN "inviteCode" varchar(8);--> statement-breakpoint
ALTER TABLE "travel_projects" ADD CONSTRAINT "travel_projects_inviteCode_unique" UNIQUE("inviteCode");