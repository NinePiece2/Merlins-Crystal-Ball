CREATE TABLE "campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_party" (
	"campaign_id" text NOT NULL,
	"character_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_party_campaign_id_character_id_pk" PRIMARY KEY("campaign_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "character" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"race" text NOT NULL,
	"class" text NOT NULL,
	"background" text,
	"portrait_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_level" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"level" integer NOT NULL,
	"sheet_url" text,
	"extracted_data" jsonb,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_level_unique" (
	"character_id" text NOT NULL,
	"level" integer NOT NULL,
	CONSTRAINT "character_level_unique_character_id_level_pk" PRIMARY KEY("character_id","level")
);
--> statement-breakpoint
CREATE TABLE "user_campaign_preference" (
	"user_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"selected_level" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_campaign_preference_user_id_campaign_id_pk" PRIMARY KEY("user_id","campaign_id")
);
--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_party" ADD CONSTRAINT "campaign_party_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_party" ADD CONSTRAINT "campaign_party_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character" ADD CONSTRAINT "character_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_level" ADD CONSTRAINT "character_level_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_level_unique" ADD CONSTRAINT "character_level_unique_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_campaign_preference" ADD CONSTRAINT "user_campaign_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_campaign_preference" ADD CONSTRAINT "user_campaign_preference_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE cascade ON UPDATE no action;