ALTER TABLE "expenses" ADD COLUMN "currency" varchar(3) DEFAULT 'KRW' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "originalAmount" real;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "exchangeRate" real;