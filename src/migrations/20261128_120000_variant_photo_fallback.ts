import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Products saved with photos only under "Extra photos" had variants without a photo, so cards, search,
// the bag and the admin lists showed no image. The Products hook now fills an empty variant photo with
// the first extra photo on save; this fills the products (and their saved drafts/versions) that exist.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "products_variants" v
    SET "image_id" = (
      SELECT r."media_id" FROM "products_rels" r
      WHERE r."parent_id" = v."_parent_id" AND r."path" = 'gallery' AND r."media_id" IS NOT NULL
      ORDER BY r."order" NULLS LAST, r."id" LIMIT 1
    )
    WHERE v."image_id" IS NULL;

    UPDATE "_products_v_version_variants" v
    SET "image_id" = (
      SELECT r."media_id" FROM "_products_v_rels" r
      WHERE r."parent_id" = v."_parent_id" AND r."path" = 'version.gallery' AND r."media_id" IS NOT NULL
      ORDER BY r."order" NULLS LAST, r."id" LIMIT 1
    )
    WHERE v."image_id" IS NULL;`)
}

// Nothing to undo: the photos filled in are the product's own, and can be changed in the admin.
export async function down(_args: MigrateDownArgs): Promise<void> {}
