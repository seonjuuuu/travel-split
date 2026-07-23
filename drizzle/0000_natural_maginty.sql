CREATE TYPE "public"."category" AS ENUM('식비', '교통', '숙박', '관광', '쇼핑', '기타');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"projectId" varchar(36) NOT NULL,
	"title" varchar(200) NOT NULL,
	"amount" real NOT NULL,
	"category" "category" DEFAULT '기타' NOT NULL,
	"payerId" varchar(36) NOT NULL,
	"participantIds" varchar(2000) DEFAULT '[]' NOT NULL,
	"date" varchar(10) DEFAULT '' NOT NULL,
	"isPreTrip" boolean DEFAULT false NOT NULL,
	"isSharedCost" boolean DEFAULT false NOT NULL,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"projectId" varchar(36) NOT NULL,
	"name" varchar(50) NOT NULL,
	"isMe" boolean DEFAULT false NOT NULL,
	"color" varchar(20) DEFAULT '#6366f1' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_projects" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"destination" varchar(100) NOT NULL,
	"startDate" varchar(10) NOT NULL,
	"endDate" varchar(10) NOT NULL,
	"myName" varchar(50) DEFAULT '나' NOT NULL,
	"shareToken" varchar(32),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
