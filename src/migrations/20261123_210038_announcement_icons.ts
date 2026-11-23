import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Announcement bar icons (Store details). Also removes the demo/sample flags the first migration still
// created; nothing uses them any more.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_store_settings_announcements_icon" AS ENUM('delivery', 'cash', 'card', 'genuine', 'gift', 'discount', 'sparkles', 'flame', 'bolt', 'clock', 'calendar', 'package', 'secure', 'star', 'heart', 'location', 'phone', 'whatsapp', 'none');
  DROP INDEX IF EXISTS "products_is_demo_idx";
  DROP INDEX IF EXISTS "_products_v_version_version_is_demo_idx";
  ALTER TABLE "store_settings_announcements" ADD COLUMN "icon" "enum_store_settings_announcements_icon";
  ALTER TABLE "products" DROP COLUMN IF EXISTS "is_demo";
  ALTER TABLE "_products_v" DROP COLUMN IF EXISTS "version_is_demo";
  ALTER TABLE "reviews" DROP COLUMN IF EXISTS "is_sample";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ADD COLUMN "is_demo" boolean DEFAULT false;
  ALTER TABLE "_products_v" ADD COLUMN "version_is_demo" boolean DEFAULT false;
  ALTER TABLE "reviews" ADD COLUMN "is_sample" boolean DEFAULT false;
  CREATE INDEX "products_is_demo_idx" ON "products" USING btree ("is_demo");
  CREATE INDEX "_products_v_version_version_is_demo_idx" ON "_products_v" USING btree ("version_is_demo");
  ALTER TABLE "store_settings_announcements" DROP COLUMN "icon";
  DROP TYPE "public"."enum_store_settings_announcements_icon";`)
}
