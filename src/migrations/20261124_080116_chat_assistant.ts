import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_chat_blocks_type" AS ENUM('ip', 'range', 'visitor', 'customer');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'cleanupChats' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'cleanupChats' BEFORE 'schedulePublish';
  CREATE TABLE "chat_conversations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"messages" jsonb,
  	"unanswered" boolean DEFAULT false,
  	"unanswered_questions" varchar,
  	"who" varchar DEFAULT 'Guest',
  	"customer_id" integer,
  	"visitor_id" varchar,
  	"start_page" varchar,
  	"product_id" integer,
  	"ip" varchar,
  	"last_ip" varchar,
  	"location" varchar,
  	"country_code" varchar,
  	"network" varchar,
  	"datacenter" boolean DEFAULT false,
  	"device" varchar,
  	"user_agent" varchar,
  	"referrer" varchar,
  	"suspicious" boolean DEFAULT false,
  	"suspicious_reasons" varchar,
  	"limit_hits" numeric DEFAULT 0,
  	"fast_messages" numeric DEFAULT 0,
  	"message_count" numeric DEFAULT 0,
  	"products_shown" numeric DEFAULT 0,
  	"handoff_clicked" boolean DEFAULT false,
  	"input_tokens" numeric DEFAULT 0,
  	"output_tokens" numeric DEFAULT 0,
  	"day" varchar,
  	"last_message_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "chat_blocks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"type" "enum_chat_blocks_type" DEFAULT 'ip' NOT NULL,
  	"value" varchar,
  	"customer_id" integer,
  	"reason" varchar,
  	"expires_at" timestamp(3) with time zone,
  	"blocked_by_id" integer,
  	"conversation_id" integer,
  	"hits" numeric DEFAULT 0,
  	"last_hit_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "chat_settings_starters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "chat_settings_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "chat_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"bot_name" varchar DEFAULT 'TOS Assistant' NOT NULL,
  	"tagline" varchar DEFAULT 'Usually replies instantly',
  	"greeting" varchar DEFAULT 'Hi! I can help you find the right product, or answer questions about delivery, payment and returns. What are you looking for today?' NOT NULL,
  	"tone" varchar,
  	"notes" varchar,
  	"per_hour" numeric DEFAULT 20 NOT NULL,
  	"per_day" numeric DEFAULT 60 NOT NULL,
  	"per_conversation" numeric DEFAULT 40 NOT NULL,
  	"max_length" numeric DEFAULT 500 NOT NULL,
  	"ip_multiplier" numeric DEFAULT 5 NOT NULL,
  	"daily_cap" numeric DEFAULT 2000 NOT NULL,
  	"auto_block" boolean DEFAULT false,
  	"auto_block_threshold" numeric DEFAULT 5,
  	"model" varchar DEFAULT 'gemini-flash-latest' NOT NULL,
  	"backup_model" varchar DEFAULT 'gemini-flash-lite-latest',
  	"temperature" numeric DEFAULT 0.4 NOT NULL,
  	"max_output_tokens" numeric DEFAULT 1200 NOT NULL,
  	"retention_days" numeric DEFAULT 90 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "chat_conversations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "chat_blocks_id" integer;
  ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "chat_blocks" ADD CONSTRAINT "chat_blocks_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "chat_blocks" ADD CONSTRAINT "chat_blocks_blocked_by_id_users_id_fk" FOREIGN KEY ("blocked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "chat_blocks" ADD CONSTRAINT "chat_blocks_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "chat_settings_starters" ADD CONSTRAINT "chat_settings_starters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."chat_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "chat_settings_faqs" ADD CONSTRAINT "chat_settings_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."chat_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "chat_conversations_unanswered_idx" ON "chat_conversations" USING btree ("unanswered");
  CREATE INDEX "chat_conversations_customer_idx" ON "chat_conversations" USING btree ("customer_id");
  CREATE INDEX "chat_conversations_visitor_id_idx" ON "chat_conversations" USING btree ("visitor_id");
  CREATE INDEX "chat_conversations_product_idx" ON "chat_conversations" USING btree ("product_id");
  CREATE INDEX "chat_conversations_ip_idx" ON "chat_conversations" USING btree ("ip");
  CREATE INDEX "chat_conversations_country_code_idx" ON "chat_conversations" USING btree ("country_code");
  CREATE INDEX "chat_conversations_suspicious_idx" ON "chat_conversations" USING btree ("suspicious");
  CREATE INDEX "chat_conversations_handoff_clicked_idx" ON "chat_conversations" USING btree ("handoff_clicked");
  CREATE INDEX "chat_conversations_day_idx" ON "chat_conversations" USING btree ("day");
  CREATE INDEX "chat_conversations_updated_at_idx" ON "chat_conversations" USING btree ("updated_at");
  CREATE INDEX "chat_conversations_created_at_idx" ON "chat_conversations" USING btree ("created_at");
  CREATE INDEX "chat_blocks_customer_idx" ON "chat_blocks" USING btree ("customer_id");
  CREATE INDEX "chat_blocks_expires_at_idx" ON "chat_blocks" USING btree ("expires_at");
  CREATE INDEX "chat_blocks_blocked_by_idx" ON "chat_blocks" USING btree ("blocked_by_id");
  CREATE INDEX "chat_blocks_conversation_idx" ON "chat_blocks" USING btree ("conversation_id");
  CREATE INDEX "chat_blocks_updated_at_idx" ON "chat_blocks" USING btree ("updated_at");
  CREATE INDEX "chat_blocks_created_at_idx" ON "chat_blocks" USING btree ("created_at");
  CREATE INDEX "chat_settings_starters_order_idx" ON "chat_settings_starters" USING btree ("_order");
  CREATE INDEX "chat_settings_starters_parent_id_idx" ON "chat_settings_starters" USING btree ("_parent_id");
  CREATE INDEX "chat_settings_faqs_order_idx" ON "chat_settings_faqs" USING btree ("_order");
  CREATE INDEX "chat_settings_faqs_parent_id_idx" ON "chat_settings_faqs" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_conversations_fk" FOREIGN KEY ("chat_conversations_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_blocks_fk" FOREIGN KEY ("chat_blocks_id") REFERENCES "public"."chat_blocks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_chat_conversations_id_idx" ON "payload_locked_documents_rels" USING btree ("chat_conversations_id");
  CREATE INDEX "payload_locked_documents_rels_chat_blocks_id_idx" ON "payload_locked_documents_rels" USING btree ("chat_blocks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "chat_conversations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "chat_blocks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "chat_settings_starters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "chat_settings_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "chat_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "chat_conversations" CASCADE;
  DROP TABLE "chat_blocks" CASCADE;
  DROP TABLE "chat_settings_starters" CASCADE;
  DROP TABLE "chat_settings_faqs" CASCADE;
  DROP TABLE "chat_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_chat_conversations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_chat_blocks_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'releaseUnpaidOrders', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'releaseUnpaidOrders', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_chat_conversations_id_idx";
  DROP INDEX "payload_locked_documents_rels_chat_blocks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "chat_conversations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "chat_blocks_id";
  DROP TYPE "public"."enum_chat_blocks_type";`)
}
