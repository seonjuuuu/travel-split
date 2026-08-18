CREATE TABLE "todos" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"projectId" varchar(36) NOT NULL,
	"title" varchar(200) NOT NULL,
	"assigneeIds" varchar(2000) DEFAULT '[]' NOT NULL,
	"isDone" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
