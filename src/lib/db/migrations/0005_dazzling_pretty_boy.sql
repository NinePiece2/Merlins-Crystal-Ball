ALTER TABLE "character_level" ALTER COLUMN "extracted_data" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "character_level" ALTER COLUMN "extracted_data" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "character" ADD COLUMN "player_name" text;