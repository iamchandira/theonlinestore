import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Typo-tolerant search (TOS-201) needs these before the trigram index below
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_shipping_address_district" AS ENUM('Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle');
  CREATE TYPE "public"."enum_orders_delivery_method" AS ENUM('standard', 'same-day');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending-payment', 'processing', 'packed', 'shipped', 'out-for-delivery', 'delivered', 'completed', 'on-hold', 'cancelled', 'refunded', 'returned', 'failed-delivery');
  CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('payhere', 'koko', 'mintpay', 'cod', 'bank-transfer');
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('unpaid', 'pending', 'slip-uploaded', 'paid', 'failed', 'partially-refunded', 'refunded');
  CREATE TYPE "public"."enum_returns_reason" AS ENUM('damaged', 'wrong-item', 'size', 'changed-mind', 'other');
  CREATE TYPE "public"."enum_returns_status" AS ENUM('requested', 'approved', 'rejected', 'received', 'refunded', 'closed');
  CREATE TYPE "public"."enum_transactions_method" AS ENUM('payhere', 'koko', 'mintpay', 'cod', 'bank-transfer');
  CREATE TYPE "public"."enum_transactions_kind" AS ENUM('payment', 'refund');
  CREATE TYPE "public"."enum_transactions_status" AS ENUM('initiated', 'pending', 'paid', 'failed', 'cancelled', 'chargeback', 'slip-uploaded', 'rejected', 'refunded', 'refund-failed');
  CREATE TYPE "public"."enum_payment_slips_status" AS ENUM('pending', 'verified', 'rejected');
  CREATE TYPE "public"."enum_discounts_mode" AS ENUM('code', 'automatic');
  CREATE TYPE "public"."enum_discounts_type" AS ENUM('percent', 'fixed', 'free-shipping', 'bogo');
  CREATE TYPE "public"."enum_discounts_applies_to" AS ENUM('all', 'products', 'categories', 'brands');
  CREATE TYPE "public"."enum_products_details_dietary" AS ENUM('Vegan', 'Vegetarian', 'Gluten-free', 'Sugar-free', 'Halal', 'Nut-free');
  CREATE TYPE "public"."enum_products_option_name" AS ENUM('Size', 'Shade', 'Scent', 'Flavour', 'Pack', 'Set', 'Colour', 'Shoe size', 'Weight', 'Style');
  CREATE TYPE "public"."enum_products_option2_name" AS ENUM('Size', 'Shade', 'Scent', 'Flavour', 'Pack', 'Set', 'Colour', 'Shoe size', 'Weight', 'Style');
  CREATE TYPE "public"."enum_products_details_concentration" AS ENUM('Parfum', 'Eau de Parfum', 'Eau de Toilette', 'Eau de Cologne', 'Body mist');
  CREATE TYPE "public"."enum_products_details_scent_family" AS ENUM('Floral', 'Fresh', 'Citrus', 'Woody', 'Oriental', 'Gourmand', 'Aquatic', 'Fruity');
  CREATE TYPE "public"."enum_products_details_longevity" AS ENUM('Light (2–4 h)', 'Moderate (4–6 h)', 'Long-lasting (6–8 h)', 'Very long (8 h+)');
  CREATE TYPE "public"."enum_products_details_gender" AS ENUM('women', 'men', 'unisex', 'kids');
  CREATE TYPE "public"."enum_products_details_footwear_style" AS ENUM('Sneakers', 'Sandals', 'Slides', 'Heels', 'Flats', 'Formal', 'Boots');
  CREATE TYPE "public"."enum_products_details_size_system" AS ENUM('EU', 'UK', 'US');
  CREATE TYPE "public"."enum_products_badge" AS ENUM('bestseller', 'new', 'trending', 'gift', 'limited');
  CREATE TYPE "public"."enum_products_product_type" AS ENUM('beauty', 'fragrance', 'footwear', 'gift', 'chocolate', 'accessory', 'home');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_details_dietary" AS ENUM('Vegan', 'Vegetarian', 'Gluten-free', 'Sugar-free', 'Halal', 'Nut-free');
  CREATE TYPE "public"."enum__products_v_version_option_name" AS ENUM('Size', 'Shade', 'Scent', 'Flavour', 'Pack', 'Set', 'Colour', 'Shoe size', 'Weight', 'Style');
  CREATE TYPE "public"."enum__products_v_version_option2_name" AS ENUM('Size', 'Shade', 'Scent', 'Flavour', 'Pack', 'Set', 'Colour', 'Shoe size', 'Weight', 'Style');
  CREATE TYPE "public"."enum__products_v_version_details_concentration" AS ENUM('Parfum', 'Eau de Parfum', 'Eau de Toilette', 'Eau de Cologne', 'Body mist');
  CREATE TYPE "public"."enum__products_v_version_details_scent_family" AS ENUM('Floral', 'Fresh', 'Citrus', 'Woody', 'Oriental', 'Gourmand', 'Aquatic', 'Fruity');
  CREATE TYPE "public"."enum__products_v_version_details_longevity" AS ENUM('Light (2–4 h)', 'Moderate (4–6 h)', 'Long-lasting (6–8 h)', 'Very long (8 h+)');
  CREATE TYPE "public"."enum__products_v_version_details_gender" AS ENUM('women', 'men', 'unisex', 'kids');
  CREATE TYPE "public"."enum__products_v_version_details_footwear_style" AS ENUM('Sneakers', 'Sandals', 'Slides', 'Heels', 'Flats', 'Formal', 'Boots');
  CREATE TYPE "public"."enum__products_v_version_details_size_system" AS ENUM('EU', 'UK', 'US');
  CREATE TYPE "public"."enum__products_v_version_badge" AS ENUM('bestseller', 'new', 'trending', 'gift', 'limited');
  CREATE TYPE "public"."enum__products_v_version_product_type" AS ENUM('beauty', 'fragrance', 'footwear', 'gift', 'chocolate', 'accessory', 'home');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_categories_tint" AS ENUM('skincare', 'hair', 'body', 'lips', 'fragrance', 'chocolate', 'footwear', 'gifts', 'sky');
  CREATE TYPE "public"."enum_brands_group" AS ENUM('k-beauty', 'derm', 'everyday', 'fragrance', 'footwear', 'gifts');
  CREATE TYPE "public"."enum_stock_movements_reason" AS ENUM('initial', 'adjustment', 'restock', 'sale', 'return', 'damaged', 'count');
  CREATE TYPE "public"."enum_users_addresses_district" AS ENUM('Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle');
  CREATE TYPE "public"."enum_users_roles" AS ENUM('super-admin', 'admin', 'store-manager', 'inventory-manager', 'order-fulfillment', 'marketing', 'support', 'customer');
  CREATE TYPE "public"."enum_users_marketing_channels" AS ENUM('email', 'sms', 'whatsapp');
  CREATE TYPE "public"."enum_audit_logs_action" AS ENUM('role-change', 'staff-created', 'price-change', 'delete', 'review-moderation', 'deletion-request', 'content-change', 'csv-import', 'payment');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'releaseUnpaidOrders', 'schedulePublish');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'releaseUnpaidOrders', 'schedulePublish');
  CREATE TYPE "public"."enum_home_page_rails_source" AS ENUM('manual', 'sale', 'bestsellers', 'new', 'tag', 'category', 'under');
  CREATE TYPE "public"."enum_home_page_rails_style" AS ENUM('plain', 'blush', 'cream', 'lilac');
  CREATE TYPE "public"."enum_home_page_rails_placement" AS ENUM('top', 'bottom');
  CREATE TYPE "public"."enum_checkout_settings_zones_districts" AS ENUM('Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle');
  CREATE TYPE "public"."enum_checkout_settings_same_day_districts" AS ENUM('Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle');
  CREATE TYPE "public"."enum_payment_settings_cod_excluded_districts" AS ENUM('Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle');
  CREATE TYPE "public"."enum_payment_settings_mode" AS ENUM('test', 'live');
  CREATE TYPE "public"."enum_policies_non_returnable_types" AS ENUM('beauty', 'fragrance', 'footwear', 'gift', 'chocolate', 'accessory', 'home');
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"sku" varchar NOT NULL,
  	"quantity" numeric NOT NULL,
  	"name" varchar NOT NULL,
  	"brand" varchar,
  	"variant" varchar,
  	"image" varchar,
  	"unit_price" numeric DEFAULT 0,
  	"line_subtotal" numeric DEFAULT 0,
  	"discount" numeric DEFAULT 0,
  	"line_total" numeric DEFAULT 0
  );
  
  CREATE TABLE "orders_discounts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"code" varchar,
  	"amount" numeric DEFAULT 0,
  	"discount_id" integer
  );
  
  CREATE TABLE "orders_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"event" varchar,
  	"by" varchar
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_number" varchar NOT NULL,
  	"totals_subtotal" numeric DEFAULT 0,
  	"totals_discount_total" numeric DEFAULT 0,
  	"totals_delivery" numeric DEFAULT 0,
  	"totals_gift_wrap" numeric DEFAULT 0,
  	"totals_payment_fee" numeric DEFAULT 0,
  	"totals_total" numeric DEFAULT 0,
  	"contact_full_name" varchar NOT NULL,
  	"contact_email" varchar NOT NULL,
  	"contact_phone" varchar NOT NULL,
  	"shipping_address_recipient_name" varchar NOT NULL,
  	"shipping_address_phone" varchar NOT NULL,
  	"shipping_address_line1" varchar NOT NULL,
  	"shipping_address_line2" varchar,
  	"shipping_address_city" varchar NOT NULL,
  	"shipping_address_district" "enum_orders_shipping_address_district" NOT NULL,
  	"shipping_address_postal_code" varchar,
  	"shipping_address_landmark" varchar,
  	"delivery_method" "enum_orders_delivery_method" DEFAULT 'standard',
  	"delivery_zone" varchar,
  	"delivery_eta" varchar,
  	"gift_wrap" boolean,
  	"gift_hide_prices" boolean,
  	"gift_message" varchar,
  	"customer_note" varchar,
  	"shipment_courier_id" integer,
  	"shipment_tracking_number" varchar,
  	"shipment_delivery_note" varchar,
  	"staff_notes" varchar,
  	"status" "enum_orders_status" DEFAULT 'pending-payment' NOT NULL,
  	"payment_method" "enum_orders_payment_method" NOT NULL,
  	"payment_status" "enum_orders_payment_status" DEFAULT 'unpaid' NOT NULL,
  	"payment_due_at" timestamp(3) with time zone,
  	"paid_at" timestamp(3) with time zone,
  	"refunded_total" numeric DEFAULT 0,
  	"status_dates_packed_at" timestamp(3) with time zone,
  	"status_dates_shipped_at" timestamp(3) with time zone,
  	"status_dates_delivered_at" timestamp(3) with time zone,
  	"status_dates_completed_at" timestamp(3) with time zone,
  	"status_dates_cancelled_at" timestamp(3) with time zone,
  	"status_dates_returned_at" timestamp(3) with time zone,
  	"cod_remittance_remitted_at" timestamp(3) with time zone,
  	"cod_remittance_reference" varchar,
  	"customer_id" integer,
  	"coupon_id" integer,
  	"terms_accepted_at" timestamp(3) with time zone,
  	"terms_version" varchar,
  	"stock_returned" boolean DEFAULT false,
  	"access_token" varchar,
  	"client_ip" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "returns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"sku" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"quantity" numeric NOT NULL,
  	"unit_refund" numeric,
  	"restocked" boolean DEFAULT false
  );
  
  CREATE TABLE "returns_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"event" varchar,
  	"by" varchar
  );
  
  CREATE TABLE "returns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"return_number" varchar NOT NULL,
  	"order_id" integer NOT NULL,
  	"reason" "enum_returns_reason" NOT NULL,
  	"status" "enum_returns_status" DEFAULT 'requested' NOT NULL,
  	"details" varchar,
  	"refund_amount" numeric,
  	"decision_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "transactions_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"status" varchar,
  	"valid" boolean,
  	"ip" varchar,
  	"data" jsonb
  );
  
  CREATE TABLE "transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar NOT NULL,
  	"order_id" integer NOT NULL,
  	"method" "enum_transactions_method" NOT NULL,
  	"kind" "enum_transactions_kind" DEFAULT 'payment' NOT NULL,
  	"status" "enum_transactions_status" DEFAULT 'initiated' NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" varchar DEFAULT 'LKR',
  	"provider_ref" varchar,
  	"message" varchar,
  	"signature_valid" boolean,
  	"simulated" boolean DEFAULT false,
  	"slip_id" integer,
  	"by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payment_slips" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"order_number" varchar,
  	"note" varchar,
  	"status" "enum_payment_slips_status" DEFAULT 'pending' NOT NULL,
  	"reason" varchar,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_preview_url" varchar,
  	"sizes_preview_width" numeric,
  	"sizes_preview_height" numeric,
  	"sizes_preview_mime_type" varchar,
  	"sizes_preview_filesize" numeric,
  	"sizes_preview_filename" varchar
  );
  
  CREATE TABLE "discounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"mode" "enum_discounts_mode" DEFAULT 'code' NOT NULL,
  	"code" varchar,
  	"type" "enum_discounts_type" DEFAULT 'percent' NOT NULL,
  	"value" numeric,
  	"max_discount" numeric,
  	"buy_qty" numeric DEFAULT 2,
  	"get_qty" numeric DEFAULT 1,
  	"get_percent" numeric DEFAULT 100,
  	"applies_to" "enum_discounts_applies_to" DEFAULT 'all' NOT NULL,
  	"exclude_sale_items" boolean DEFAULT false,
  	"min_spend" numeric,
  	"first_order_only" boolean DEFAULT false,
  	"usage_limit" numeric,
  	"usage_per_customer" numeric DEFAULT 1,
  	"combinable" boolean DEFAULT false,
  	"priority" numeric DEFAULT 10,
  	"active" boolean DEFAULT true,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"used_count" numeric DEFAULT 0,
  	"internal_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "discounts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"categories_id" integer,
  	"brands_id" integer
  );
  
  CREATE TABLE "products_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"option2" varchar,
  	"sku" varchar,
  	"barcode" varchar,
  	"price" numeric,
  	"compare_at_price" numeric,
  	"cost" numeric,
  	"weight" numeric,
  	"stock" numeric DEFAULT 0,
  	"low_stock_threshold" numeric DEFAULT 5,
  	"image_id" integer
  );
  
  CREATE TABLE "products_details_dietary" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_details_dietary",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"brand_id" integer,
  	"short_description" varchar,
  	"description" jsonb,
  	"benefits" varchar,
  	"how_to_use" varchar,
  	"ingredients" varchar,
  	"option_name" "enum_products_option_name" DEFAULT 'Size',
  	"option2_name" "enum_products_option2_name",
  	"details_concentration" "enum_products_details_concentration",
  	"details_scent_family" "enum_products_details_scent_family",
  	"details_longevity" "enum_products_details_longevity",
  	"details_top_notes" varchar,
  	"details_heart_notes" varchar,
  	"details_base_notes" varchar,
  	"details_gender" "enum_products_details_gender",
  	"details_footwear_style" "enum_products_details_footwear_style",
  	"details_material" varchar,
  	"details_size_system" "enum_products_details_size_system" DEFAULT 'EU',
  	"details_fit" varchar,
  	"details_net_weight" numeric,
  	"details_cocoa_percent" numeric,
  	"details_origin" varchar,
  	"details_allergens" varchar,
  	"details_storage" varchar,
  	"details_contents" varchar,
  	"details_gift_wrapped" boolean,
  	"details_personalisable" boolean,
  	"badge" "enum_products_badge",
  	"product_type" "enum_products_product_type" DEFAULT 'beauty',
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"is_demo" boolean DEFAULT false,
  	"price_t_b_c" boolean DEFAULT false,
  	"min_price" numeric,
  	"max_price" numeric,
  	"total_stock" numeric,
  	"low_stock" boolean,
  	"on_sale" boolean,
  	"sales_count" numeric DEFAULT 0,
  	"rating" numeric,
  	"review_count" numeric,
  	"search_text" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"media_id" integer,
  	"tags_id" integer,
  	"recipients_id" integer,
  	"occasions_id" integer,
  	"concerns_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "_products_v_version_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"option2" varchar,
  	"sku" varchar,
  	"barcode" varchar,
  	"price" numeric,
  	"compare_at_price" numeric,
  	"cost" numeric,
  	"weight" numeric,
  	"stock" numeric DEFAULT 0,
  	"low_stock_threshold" numeric DEFAULT 5,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_details_dietary" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__products_v_version_details_dietary",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_brand_id" integer,
  	"version_short_description" varchar,
  	"version_description" jsonb,
  	"version_benefits" varchar,
  	"version_how_to_use" varchar,
  	"version_ingredients" varchar,
  	"version_option_name" "enum__products_v_version_option_name" DEFAULT 'Size',
  	"version_option2_name" "enum__products_v_version_option2_name",
  	"version_details_concentration" "enum__products_v_version_details_concentration",
  	"version_details_scent_family" "enum__products_v_version_details_scent_family",
  	"version_details_longevity" "enum__products_v_version_details_longevity",
  	"version_details_top_notes" varchar,
  	"version_details_heart_notes" varchar,
  	"version_details_base_notes" varchar,
  	"version_details_gender" "enum__products_v_version_details_gender",
  	"version_details_footwear_style" "enum__products_v_version_details_footwear_style",
  	"version_details_material" varchar,
  	"version_details_size_system" "enum__products_v_version_details_size_system" DEFAULT 'EU',
  	"version_details_fit" varchar,
  	"version_details_net_weight" numeric,
  	"version_details_cocoa_percent" numeric,
  	"version_details_origin" varchar,
  	"version_details_allergens" varchar,
  	"version_details_storage" varchar,
  	"version_details_contents" varchar,
  	"version_details_gift_wrapped" boolean,
  	"version_details_personalisable" boolean,
  	"version_badge" "enum__products_v_version_badge",
  	"version_product_type" "enum__products_v_version_product_type" DEFAULT 'beauty',
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_is_demo" boolean DEFAULT false,
  	"version_price_t_b_c" boolean DEFAULT false,
  	"version_min_price" numeric,
  	"version_max_price" numeric,
  	"version_total_stock" numeric,
  	"version_low_stock" boolean,
  	"version_on_sale" boolean,
  	"version_sales_count" numeric DEFAULT 0,
  	"version_rating" numeric,
  	"version_review_count" numeric,
  	"version_search_text" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"media_id" integer,
  	"tags_id" integer,
  	"recipients_id" integer,
  	"occasions_id" integer,
  	"concerns_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"rating" numeric NOT NULL,
  	"title" varchar,
  	"body" varchar NOT NULL,
  	"reply" varchar,
  	"author_name" varchar NOT NULL,
  	"author_email" varchar,
  	"status" "enum_reviews_status" DEFAULT 'pending' NOT NULL,
  	"verified_buyer" boolean DEFAULT false,
  	"helpful_count" numeric DEFAULT 0,
  	"user_id" integer,
  	"is_sample" boolean DEFAULT false,
  	"moderation_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"review_media_id" integer
  );
  
  CREATE TABLE "review_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar DEFAULT 'Customer photo',
  	"public" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar
  );
  
  CREATE TABLE "categories_breadcrumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"doc_id" integer,
  	"url" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"blurb" varchar,
  	"description" varchar,
  	"tint" "enum_categories_tint" DEFAULT 'skincare',
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"parent_id" integer,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "brands" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"group" "enum_brands_group" DEFAULT 'everyday' NOT NULL,
  	"featured" boolean DEFAULT false,
  	"logo_id" integer,
  	"description" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "concerns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "occasions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "recipients" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stock_movements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"sku" varchar NOT NULL,
  	"variant_label" varchar,
  	"change" numeric NOT NULL,
  	"resulting_stock" numeric NOT NULL,
  	"reason" "enum_stock_movements_reason" DEFAULT 'adjustment' NOT NULL,
  	"note" varchar,
  	"user_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "search_queries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"term" varchar NOT NULL,
  	"day" varchar NOT NULL,
  	"count" numeric DEFAULT 1 NOT NULL,
  	"results" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "users_addresses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar DEFAULT 'Home',
  	"recipient_name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"line1" varchar NOT NULL,
  	"line2" varchar,
  	"city" varchar NOT NULL,
  	"district" "enum_users_addresses_district" NOT NULL,
  	"postal_code" varchar,
  	"landmark" varchar,
  	"is_default" boolean DEFAULT false
  );
  
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_marketing_channels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_marketing_channels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_name" varchar,
  	"phone" varchar,
  	"marketing_opt_in" boolean DEFAULT false,
  	"marketing_consent_at" timestamp(3) with time zone,
  	"deletion_requested_at" timestamp(3) with time zone,
  	"wishlist" jsonb,
  	"cart" jsonb,
  	"staff_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "couriers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"tracking_url" varchar,
  	"active" boolean DEFAULT true,
  	"requires_tracking" boolean DEFAULT true,
  	"collects_cod" boolean DEFAULT true,
  	"phone" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" "enum_audit_logs_action" NOT NULL,
  	"summary" varchar NOT NULL,
  	"resource" varchar,
  	"doc_id" varchar,
  	"changes" jsonb,
  	"user_id" integer,
  	"user_email" varchar,
  	"ip" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"orders_id" integer,
  	"returns_id" integer,
  	"transactions_id" integer,
  	"payment_slips_id" integer,
  	"discounts_id" integer,
  	"products_id" integer,
  	"reviews_id" integer,
  	"review_media_id" integer,
  	"categories_id" integer,
  	"brands_id" integer,
  	"tags_id" integer,
  	"concerns_id" integer,
  	"occasions_id" integer,
  	"recipients_id" integer,
  	"stock_movements_id" integer,
  	"search_queries_id" integer,
  	"media_id" integer,
  	"users_id" integer,
  	"couriers_id" integer,
  	"audit_logs_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "store_settings_announcements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "store_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"store_name" varchar DEFAULT 'The Online Store' NOT NULL,
  	"description" varchar DEFAULT 'Genuine skincare, haircare, fragrances, footwear, gifts and chocolates, delivered island-wide in Sri Lanka.',
  	"delivery_estimate" varchar DEFAULT '2–4 working days',
  	"contact_phone" varchar,
  	"contact_whatsapp" varchar,
  	"contact_email" varchar,
  	"contact_hours" varchar,
  	"contact_address" varchar,
  	"contact_business_registration" varchar,
  	"social_facebook" varchar,
  	"social_instagram" varchar,
  	"social_tiktok" varchar,
  	"social_youtube" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_rails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar NOT NULL,
  	"link_label" varchar DEFAULT 'View all',
  	"description" varchar,
  	"source" "enum_home_page_rails_source" DEFAULT 'manual' NOT NULL,
  	"limit" numeric DEFAULT 12,
  	"style" "enum_home_page_rails_style" DEFAULT 'plain',
  	"placement" "enum_home_page_rails_placement" DEFAULT 'top',
  	"countdown" boolean DEFAULT false,
  	"tag_id" integer,
  	"category_id" integer,
  	"max_price" numeric
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sections_hero_badge" varchar,
  	"sections_sale_show" boolean DEFAULT false,
  	"sections_sale_label" varchar DEFAULT 'Flash sale',
  	"sections_sale_title" varchar,
  	"sections_sale_button_label" varchar DEFAULT 'Shop the sale',
  	"sections_sale_link" varchar DEFAULT '/offers',
  	"sections_sale_ends_at" timestamp(3) with time zone,
  	"sections_gift_show" boolean DEFAULT true,
  	"sections_gift_title" varchar DEFAULT 'Gifts they’ll actually love',
  	"sections_gift_text" varchar DEFAULT 'Gift sets, wrapping and a handwritten note on request.',
  	"sections_gift_link" varchar DEFAULT '/gifts',
  	"sections_gift_finder_text" varchar DEFAULT 'Gift wrapping and a handwritten note on request. We deliver island-wide.',
  	"sections_newsletter_show" boolean DEFAULT true,
  	"sections_newsletter_title" varchar DEFAULT 'Be the first to know',
  	"sections_newsletter_text" varchar DEFAULT 'New arrivals, restocks and members-only deals. No spam, unsubscribe anytime.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "checkout_settings_zones_districts" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_checkout_settings_zones_districts",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "checkout_settings_zones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"fee" numeric NOT NULL,
  	"eta" varchar NOT NULL
  );
  
  CREATE TABLE "checkout_settings_same_day_districts" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_checkout_settings_same_day_districts",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "checkout_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"free_delivery_enabled" boolean DEFAULT true,
  	"free_threshold" numeric DEFAULT 10000,
  	"included_kg" numeric DEFAULT 1,
  	"per_kg_fee" numeric DEFAULT 100,
  	"fallback_fee" numeric DEFAULT 450,
  	"fallback_eta" varchar DEFAULT '2–4 working days',
  	"same_day_enabled" boolean DEFAULT true,
  	"same_day_fee" numeric DEFAULT 650,
  	"same_day_cutoff_hour" numeric DEFAULT 12,
  	"same_day_eta" varchar DEFAULT 'Today, by 9 pm',
  	"gift_wrap_fee" numeric DEFAULT 250,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payment_settings_cod_excluded_districts" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_payment_settings_cod_excluded_districts",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payment_settings_bank_transfer_accounts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"bank_name" varchar NOT NULL,
  	"branch" varchar,
  	"account_name" varchar NOT NULL,
  	"account_number" varchar NOT NULL,
  	"branch_code" varchar,
  	"swift" varchar
  );
  
  CREATE TABLE "payment_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mode" "enum_payment_settings_mode" DEFAULT 'test' NOT NULL,
  	"online_hold_minutes" numeric DEFAULT 60,
  	"simulate_gateways" boolean DEFAULT true,
  	"payhere_enabled" boolean DEFAULT true,
  	"payhere_sort_order" numeric DEFAULT 10,
  	"payhere_min_order" numeric DEFAULT 0,
  	"payhere_max_order" numeric DEFAULT 0,
  	"payhere_label" varchar DEFAULT 'Card, eZ Cash, mCash or Genie',
  	"payhere_merchant_id" varchar,
  	"payhere_merchant_secret" varchar,
  	"payhere_app_id" varchar,
  	"payhere_app_secret" varchar,
  	"koko_enabled" boolean DEFAULT true,
  	"koko_sort_order" numeric DEFAULT 20,
  	"koko_min_order" numeric DEFAULT 1000,
  	"koko_max_order" numeric DEFAULT 100000,
  	"koko_label" varchar DEFAULT 'Koko: 3 interest-free instalments',
  	"koko_show_on_products" boolean DEFAULT false,
  	"koko_fee_percent" numeric DEFAULT 0,
  	"koko_merchant_id" varchar,
  	"koko_api_key" varchar,
  	"koko_private_key" varchar,
  	"koko_public_key" varchar,
  	"mintpay_enabled" boolean DEFAULT true,
  	"mintpay_sort_order" numeric DEFAULT 30,
  	"mintpay_min_order" numeric DEFAULT 1000,
  	"mintpay_max_order" numeric DEFAULT 150000,
  	"mintpay_label" varchar DEFAULT 'Mintpay: 3 interest-free instalments',
  	"mintpay_show_on_products" boolean DEFAULT false,
  	"mintpay_fee_percent" numeric DEFAULT 0,
  	"mintpay_merchant_id" varchar,
  	"mintpay_merchant_secret" varchar,
  	"cod_enabled" boolean DEFAULT true,
  	"cod_sort_order" numeric DEFAULT 40,
  	"cod_min_order" numeric DEFAULT 0,
  	"cod_max_order" numeric DEFAULT 50000,
  	"cod_fee" numeric DEFAULT 0,
  	"bank_transfer_enabled" boolean DEFAULT true,
  	"bank_transfer_sort_order" numeric DEFAULT 50,
  	"bank_transfer_instructions" varchar,
  	"bank_transfer_hold_hours" numeric DEFAULT 48,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "policies_non_returnable_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_policies_non_returnable_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "policies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"terms_title" varchar DEFAULT 'Terms & conditions',
  	"terms_body" jsonb,
  	"terms_version" varchar DEFAULT '2026-11' NOT NULL,
  	"returns_title" varchar DEFAULT 'Returns & refunds',
  	"returns_body" jsonb,
  	"return_window_days" numeric DEFAULT 7,
  	"privacy_title" varchar DEFAULT 'Privacy policy',
  	"privacy_body" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_discounts" ADD CONSTRAINT "orders_discounts_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_discounts" ADD CONSTRAINT "orders_discounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_timeline" ADD CONSTRAINT "orders_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_shipment_courier_id_couriers_id_fk" FOREIGN KEY ("shipment_courier_id") REFERENCES "public"."couriers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_discounts_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."discounts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "returns_items" ADD CONSTRAINT "returns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "returns_timeline" ADD CONSTRAINT "returns_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions_events" ADD CONSTRAINT "transactions_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_slip_id_payment_slips_id_fk" FOREIGN KEY ("slip_id") REFERENCES "public"."payment_slips"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "discounts_rels" ADD CONSTRAINT "discounts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "discounts_rels" ADD CONSTRAINT "discounts_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "discounts_rels" ADD CONSTRAINT "discounts_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "discounts_rels" ADD CONSTRAINT "discounts_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_details_dietary" ADD CONSTRAINT "products_details_dietary_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_recipients_fk" FOREIGN KEY ("recipients_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_occasions_fk" FOREIGN KEY ("occasions_id") REFERENCES "public"."occasions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_concerns_fk" FOREIGN KEY ("concerns_id") REFERENCES "public"."concerns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_details_dietary" ADD CONSTRAINT "_products_v_version_details_dietary_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_brand_id_brands_id_fk" FOREIGN KEY ("version_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_recipients_fk" FOREIGN KEY ("recipients_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_occasions_fk" FOREIGN KEY ("occasions_id") REFERENCES "public"."occasions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_concerns_fk" FOREIGN KEY ("concerns_id") REFERENCES "public"."concerns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews_rels" ADD CONSTRAINT "reviews_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews_rels" ADD CONSTRAINT "reviews_rels_review_media_fk" FOREIGN KEY ("review_media_id") REFERENCES "public"."review_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_breadcrumbs" ADD CONSTRAINT "categories_breadcrumbs_doc_id_categories_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_breadcrumbs" ADD CONSTRAINT "categories_breadcrumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_addresses" ADD CONSTRAINT "users_addresses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_marketing_channels" ADD CONSTRAINT "users_marketing_channels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_returns_fk" FOREIGN KEY ("returns_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_slips_fk" FOREIGN KEY ("payment_slips_id") REFERENCES "public"."payment_slips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_discounts_fk" FOREIGN KEY ("discounts_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_review_media_fk" FOREIGN KEY ("review_media_id") REFERENCES "public"."review_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_concerns_fk" FOREIGN KEY ("concerns_id") REFERENCES "public"."concerns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_occasions_fk" FOREIGN KEY ("occasions_id") REFERENCES "public"."occasions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recipients_fk" FOREIGN KEY ("recipients_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_movements_fk" FOREIGN KEY ("stock_movements_id") REFERENCES "public"."stock_movements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_queries_fk" FOREIGN KEY ("search_queries_id") REFERENCES "public"."search_queries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_couriers_fk" FOREIGN KEY ("couriers_id") REFERENCES "public"."couriers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "store_settings_announcements" ADD CONSTRAINT "store_settings_announcements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."store_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rails" ADD CONSTRAINT "home_page_rails_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_rails" ADD CONSTRAINT "home_page_rails_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_rails" ADD CONSTRAINT "home_page_rails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checkout_settings_zones_districts" ADD CONSTRAINT "checkout_settings_zones_districts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."checkout_settings_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checkout_settings_zones" ADD CONSTRAINT "checkout_settings_zones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checkout_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checkout_settings_same_day_districts" ADD CONSTRAINT "checkout_settings_same_day_districts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."checkout_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payment_settings_cod_excluded_districts" ADD CONSTRAINT "payment_settings_cod_excluded_districts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payment_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payment_settings_bank_transfer_accounts" ADD CONSTRAINT "payment_settings_bank_transfer_accounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payment_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "policies_non_returnable_types" ADD CONSTRAINT "policies_non_returnable_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "orders_items" USING btree ("product_id");
  CREATE INDEX "orders_discounts_order_idx" ON "orders_discounts" USING btree ("_order");
  CREATE INDEX "orders_discounts_parent_id_idx" ON "orders_discounts" USING btree ("_parent_id");
  CREATE INDEX "orders_discounts_discount_idx" ON "orders_discounts" USING btree ("discount_id");
  CREATE INDEX "orders_timeline_order_idx" ON "orders_timeline" USING btree ("_order");
  CREATE INDEX "orders_timeline_parent_id_idx" ON "orders_timeline" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE INDEX "orders_contact_contact_email_idx" ON "orders" USING btree ("contact_email");
  CREATE INDEX "orders_contact_contact_phone_idx" ON "orders" USING btree ("contact_phone");
  CREATE INDEX "orders_shipment_shipment_courier_idx" ON "orders" USING btree ("shipment_courier_id");
  CREATE INDEX "orders_shipment_shipment_tracking_number_idx" ON "orders" USING btree ("shipment_tracking_number");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_payment_due_at_idx" ON "orders" USING btree ("payment_due_at");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_coupon_idx" ON "orders" USING btree ("coupon_id");
  CREATE INDEX "orders_access_token_idx" ON "orders" USING btree ("access_token");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "returns_items_order_idx" ON "returns_items" USING btree ("_order");
  CREATE INDEX "returns_items_parent_id_idx" ON "returns_items" USING btree ("_parent_id");
  CREATE INDEX "returns_timeline_order_idx" ON "returns_timeline" USING btree ("_order");
  CREATE INDEX "returns_timeline_parent_id_idx" ON "returns_timeline" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "returns_return_number_idx" ON "returns" USING btree ("return_number");
  CREATE INDEX "returns_order_idx" ON "returns" USING btree ("order_id");
  CREATE INDEX "returns_status_idx" ON "returns" USING btree ("status");
  CREATE INDEX "returns_updated_at_idx" ON "returns" USING btree ("updated_at");
  CREATE INDEX "returns_created_at_idx" ON "returns" USING btree ("created_at");
  CREATE INDEX "transactions_events_order_idx" ON "transactions_events" USING btree ("_order");
  CREATE INDEX "transactions_events_parent_id_idx" ON "transactions_events" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "transactions_reference_idx" ON "transactions" USING btree ("reference");
  CREATE INDEX "transactions_order_idx" ON "transactions" USING btree ("order_id");
  CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");
  CREATE INDEX "transactions_provider_ref_idx" ON "transactions" USING btree ("provider_ref");
  CREATE INDEX "transactions_slip_idx" ON "transactions" USING btree ("slip_id");
  CREATE INDEX "transactions_by_idx" ON "transactions" USING btree ("by_id");
  CREATE INDEX "transactions_updated_at_idx" ON "transactions" USING btree ("updated_at");
  CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");
  CREATE INDEX "payment_slips_order_idx" ON "payment_slips" USING btree ("order_id");
  CREATE INDEX "payment_slips_order_number_idx" ON "payment_slips" USING btree ("order_number");
  CREATE INDEX "payment_slips_reviewed_by_idx" ON "payment_slips" USING btree ("reviewed_by_id");
  CREATE INDEX "payment_slips_updated_at_idx" ON "payment_slips" USING btree ("updated_at");
  CREATE INDEX "payment_slips_created_at_idx" ON "payment_slips" USING btree ("created_at");
  CREATE UNIQUE INDEX "payment_slips_filename_idx" ON "payment_slips" USING btree ("filename");
  CREATE INDEX "payment_slips_sizes_preview_sizes_preview_filename_idx" ON "payment_slips" USING btree ("sizes_preview_filename");
  CREATE UNIQUE INDEX "discounts_code_idx" ON "discounts" USING btree ("code");
  CREATE INDEX "discounts_active_idx" ON "discounts" USING btree ("active");
  CREATE INDEX "discounts_updated_at_idx" ON "discounts" USING btree ("updated_at");
  CREATE INDEX "discounts_created_at_idx" ON "discounts" USING btree ("created_at");
  CREATE INDEX "discounts_rels_order_idx" ON "discounts_rels" USING btree ("order");
  CREATE INDEX "discounts_rels_parent_idx" ON "discounts_rels" USING btree ("parent_id");
  CREATE INDEX "discounts_rels_path_idx" ON "discounts_rels" USING btree ("path");
  CREATE INDEX "discounts_rels_products_id_idx" ON "discounts_rels" USING btree ("products_id");
  CREATE INDEX "discounts_rels_categories_id_idx" ON "discounts_rels" USING btree ("categories_id");
  CREATE INDEX "discounts_rels_brands_id_idx" ON "discounts_rels" USING btree ("brands_id");
  CREATE INDEX "products_variants_order_idx" ON "products_variants" USING btree ("_order");
  CREATE INDEX "products_variants_parent_id_idx" ON "products_variants" USING btree ("_parent_id");
  CREATE INDEX "products_variants_sku_idx" ON "products_variants" USING btree ("sku");
  CREATE INDEX "products_variants_image_idx" ON "products_variants" USING btree ("image_id");
  CREATE INDEX "products_details_dietary_order_idx" ON "products_details_dietary" USING btree ("order");
  CREATE INDEX "products_details_dietary_parent_idx" ON "products_details_dietary" USING btree ("parent_id");
  CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_id");
  CREATE INDEX "products_product_type_idx" ON "products" USING btree ("product_type");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_is_demo_idx" ON "products" USING btree ("is_demo");
  CREATE INDEX "products_min_price_idx" ON "products" USING btree ("min_price");
  CREATE INDEX "products_low_stock_idx" ON "products" USING btree ("low_stock");
  CREATE INDEX "products_on_sale_idx" ON "products" USING btree ("on_sale");
  CREATE INDEX "products_sales_count_idx" ON "products" USING btree ("sales_count");
  CREATE INDEX "products_search_text_idx" ON "products" USING btree ("search_text");
  CREATE INDEX "products_meta_meta_image_idx" ON "products" USING btree ("meta_image_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE INDEX "products_search_text_trgm" ON "products" USING gin ("search_text" gin_trgm_ops);
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_categories_id_idx" ON "products_rels" USING btree ("categories_id");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE INDEX "products_rels_tags_id_idx" ON "products_rels" USING btree ("tags_id");
  CREATE INDEX "products_rels_recipients_id_idx" ON "products_rels" USING btree ("recipients_id");
  CREATE INDEX "products_rels_occasions_id_idx" ON "products_rels" USING btree ("occasions_id");
  CREATE INDEX "products_rels_concerns_id_idx" ON "products_rels" USING btree ("concerns_id");
  CREATE INDEX "products_rels_products_id_idx" ON "products_rels" USING btree ("products_id");
  CREATE INDEX "_products_v_version_variants_order_idx" ON "_products_v_version_variants" USING btree ("_order");
  CREATE INDEX "_products_v_version_variants_parent_id_idx" ON "_products_v_version_variants" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_variants_sku_idx" ON "_products_v_version_variants" USING btree ("sku");
  CREATE INDEX "_products_v_version_variants_image_idx" ON "_products_v_version_variants" USING btree ("image_id");
  CREATE INDEX "_products_v_version_details_dietary_order_idx" ON "_products_v_version_details_dietary" USING btree ("order");
  CREATE INDEX "_products_v_version_details_dietary_parent_idx" ON "_products_v_version_details_dietary" USING btree ("parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_brand_idx" ON "_products_v" USING btree ("version_brand_id");
  CREATE INDEX "_products_v_version_version_product_type_idx" ON "_products_v" USING btree ("version_product_type");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_is_demo_idx" ON "_products_v" USING btree ("version_is_demo");
  CREATE INDEX "_products_v_version_version_min_price_idx" ON "_products_v" USING btree ("version_min_price");
  CREATE INDEX "_products_v_version_version_low_stock_idx" ON "_products_v" USING btree ("version_low_stock");
  CREATE INDEX "_products_v_version_version_on_sale_idx" ON "_products_v" USING btree ("version_on_sale");
  CREATE INDEX "_products_v_version_version_sales_count_idx" ON "_products_v" USING btree ("version_sales_count");
  CREATE INDEX "_products_v_version_version_search_text_idx" ON "_products_v" USING btree ("version_search_text");
  CREATE INDEX "_products_v_version_meta_version_meta_image_idx" ON "_products_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_categories_id_idx" ON "_products_v_rels" USING btree ("categories_id");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_rels_tags_id_idx" ON "_products_v_rels" USING btree ("tags_id");
  CREATE INDEX "_products_v_rels_recipients_id_idx" ON "_products_v_rels" USING btree ("recipients_id");
  CREATE INDEX "_products_v_rels_occasions_id_idx" ON "_products_v_rels" USING btree ("occasions_id");
  CREATE INDEX "_products_v_rels_concerns_id_idx" ON "_products_v_rels" USING btree ("concerns_id");
  CREATE INDEX "_products_v_rels_products_id_idx" ON "_products_v_rels" USING btree ("products_id");
  CREATE INDEX "reviews_product_idx" ON "reviews" USING btree ("product_id");
  CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");
  CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX "reviews_rels_order_idx" ON "reviews_rels" USING btree ("order");
  CREATE INDEX "reviews_rels_parent_idx" ON "reviews_rels" USING btree ("parent_id");
  CREATE INDEX "reviews_rels_path_idx" ON "reviews_rels" USING btree ("path");
  CREATE INDEX "reviews_rels_review_media_id_idx" ON "reviews_rels" USING btree ("review_media_id");
  CREATE INDEX "review_media_public_idx" ON "review_media" USING btree ("public");
  CREATE INDEX "review_media_updated_at_idx" ON "review_media" USING btree ("updated_at");
  CREATE INDEX "review_media_created_at_idx" ON "review_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "review_media_filename_idx" ON "review_media" USING btree ("filename");
  CREATE INDEX "review_media_sizes_thumb_sizes_thumb_filename_idx" ON "review_media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "review_media_sizes_large_sizes_large_filename_idx" ON "review_media" USING btree ("sizes_large_filename");
  CREATE INDEX "categories_breadcrumbs_order_idx" ON "categories_breadcrumbs" USING btree ("_order");
  CREATE INDEX "categories_breadcrumbs_parent_id_idx" ON "categories_breadcrumbs" USING btree ("_parent_id");
  CREATE INDEX "categories_breadcrumbs_doc_idx" ON "categories_breadcrumbs" USING btree ("doc_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_meta_meta_image_idx" ON "categories" USING btree ("meta_image_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "brands_name_idx" ON "brands" USING btree ("name");
  CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");
  CREATE INDEX "brands_logo_idx" ON "brands" USING btree ("logo_id");
  CREATE INDEX "brands_meta_meta_image_idx" ON "brands" USING btree ("meta_image_id");
  CREATE INDEX "brands_updated_at_idx" ON "brands" USING btree ("updated_at");
  CREATE INDEX "brands_created_at_idx" ON "brands" USING btree ("created_at");
  CREATE UNIQUE INDEX "tags_name_idx" ON "tags" USING btree ("name");
  CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE UNIQUE INDEX "concerns_name_idx" ON "concerns" USING btree ("name");
  CREATE UNIQUE INDEX "concerns_slug_idx" ON "concerns" USING btree ("slug");
  CREATE INDEX "concerns_updated_at_idx" ON "concerns" USING btree ("updated_at");
  CREATE INDEX "concerns_created_at_idx" ON "concerns" USING btree ("created_at");
  CREATE UNIQUE INDEX "occasions_name_idx" ON "occasions" USING btree ("name");
  CREATE UNIQUE INDEX "occasions_slug_idx" ON "occasions" USING btree ("slug");
  CREATE INDEX "occasions_updated_at_idx" ON "occasions" USING btree ("updated_at");
  CREATE INDEX "occasions_created_at_idx" ON "occasions" USING btree ("created_at");
  CREATE UNIQUE INDEX "recipients_name_idx" ON "recipients" USING btree ("name");
  CREATE UNIQUE INDEX "recipients_slug_idx" ON "recipients" USING btree ("slug");
  CREATE INDEX "recipients_updated_at_idx" ON "recipients" USING btree ("updated_at");
  CREATE INDEX "recipients_created_at_idx" ON "recipients" USING btree ("created_at");
  CREATE INDEX "stock_movements_product_idx" ON "stock_movements" USING btree ("product_id");
  CREATE INDEX "stock_movements_sku_idx" ON "stock_movements" USING btree ("sku");
  CREATE INDEX "stock_movements_user_idx" ON "stock_movements" USING btree ("user_id");
  CREATE INDEX "stock_movements_updated_at_idx" ON "stock_movements" USING btree ("updated_at");
  CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");
  CREATE INDEX "search_queries_term_idx" ON "search_queries" USING btree ("term");
  CREATE INDEX "search_queries_day_idx" ON "search_queries" USING btree ("day");
  CREATE INDEX "search_queries_updated_at_idx" ON "search_queries" USING btree ("updated_at");
  CREATE INDEX "search_queries_created_at_idx" ON "search_queries" USING btree ("created_at");
  CREATE UNIQUE INDEX "term_day_idx" ON "search_queries" USING btree ("term","day");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE INDEX "users_addresses_order_idx" ON "users_addresses" USING btree ("_order");
  CREATE INDEX "users_addresses_parent_id_idx" ON "users_addresses" USING btree ("_parent_id");
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_marketing_channels_order_idx" ON "users_marketing_channels" USING btree ("order");
  CREATE INDEX "users_marketing_channels_parent_idx" ON "users_marketing_channels" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "couriers_name_idx" ON "couriers" USING btree ("name");
  CREATE INDEX "couriers_updated_at_idx" ON "couriers" USING btree ("updated_at");
  CREATE INDEX "couriers_created_at_idx" ON "couriers" USING btree ("created_at");
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource");
  CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_returns_id_idx" ON "payload_locked_documents_rels" USING btree ("returns_id");
  CREATE INDEX "payload_locked_documents_rels_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("transactions_id");
  CREATE INDEX "payload_locked_documents_rels_payment_slips_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_slips_id");
  CREATE INDEX "payload_locked_documents_rels_discounts_id_idx" ON "payload_locked_documents_rels" USING btree ("discounts_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_review_media_id_idx" ON "payload_locked_documents_rels" USING btree ("review_media_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("brands_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_concerns_id_idx" ON "payload_locked_documents_rels" USING btree ("concerns_id");
  CREATE INDEX "payload_locked_documents_rels_occasions_id_idx" ON "payload_locked_documents_rels" USING btree ("occasions_id");
  CREATE INDEX "payload_locked_documents_rels_recipients_id_idx" ON "payload_locked_documents_rels" USING btree ("recipients_id");
  CREATE INDEX "payload_locked_documents_rels_stock_movements_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_movements_id");
  CREATE INDEX "payload_locked_documents_rels_search_queries_id_idx" ON "payload_locked_documents_rels" USING btree ("search_queries_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_couriers_id_idx" ON "payload_locked_documents_rels" USING btree ("couriers_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "store_settings_announcements_order_idx" ON "store_settings_announcements" USING btree ("_order");
  CREATE INDEX "store_settings_announcements_parent_id_idx" ON "store_settings_announcements" USING btree ("_parent_id");
  CREATE INDEX "home_page_rails_order_idx" ON "home_page_rails" USING btree ("_order");
  CREATE INDEX "home_page_rails_parent_id_idx" ON "home_page_rails" USING btree ("_parent_id");
  CREATE INDEX "home_page_rails_tag_idx" ON "home_page_rails" USING btree ("tag_id");
  CREATE INDEX "home_page_rails_category_idx" ON "home_page_rails" USING btree ("category_id");
  CREATE INDEX "home_page_rels_order_idx" ON "home_page_rels" USING btree ("order");
  CREATE INDEX "home_page_rels_parent_idx" ON "home_page_rels" USING btree ("parent_id");
  CREATE INDEX "home_page_rels_path_idx" ON "home_page_rels" USING btree ("path");
  CREATE INDEX "home_page_rels_products_id_idx" ON "home_page_rels" USING btree ("products_id");
  CREATE INDEX "checkout_settings_zones_districts_order_idx" ON "checkout_settings_zones_districts" USING btree ("order");
  CREATE INDEX "checkout_settings_zones_districts_parent_idx" ON "checkout_settings_zones_districts" USING btree ("parent_id");
  CREATE INDEX "checkout_settings_zones_order_idx" ON "checkout_settings_zones" USING btree ("_order");
  CREATE INDEX "checkout_settings_zones_parent_id_idx" ON "checkout_settings_zones" USING btree ("_parent_id");
  CREATE INDEX "checkout_settings_same_day_districts_order_idx" ON "checkout_settings_same_day_districts" USING btree ("order");
  CREATE INDEX "checkout_settings_same_day_districts_parent_idx" ON "checkout_settings_same_day_districts" USING btree ("parent_id");
  CREATE INDEX "payment_settings_cod_excluded_districts_order_idx" ON "payment_settings_cod_excluded_districts" USING btree ("order");
  CREATE INDEX "payment_settings_cod_excluded_districts_parent_idx" ON "payment_settings_cod_excluded_districts" USING btree ("parent_id");
  CREATE INDEX "payment_settings_bank_transfer_accounts_order_idx" ON "payment_settings_bank_transfer_accounts" USING btree ("_order");
  CREATE INDEX "payment_settings_bank_transfer_accounts_parent_id_idx" ON "payment_settings_bank_transfer_accounts" USING btree ("_parent_id");
  CREATE INDEX "policies_non_returnable_types_order_idx" ON "policies_non_returnable_types" USING btree ("order");
  CREATE INDEX "policies_non_returnable_types_parent_idx" ON "policies_non_returnable_types" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders_discounts" CASCADE;
  DROP TABLE "orders_timeline" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "returns_items" CASCADE;
  DROP TABLE "returns_timeline" CASCADE;
  DROP TABLE "returns" CASCADE;
  DROP TABLE "transactions_events" CASCADE;
  DROP TABLE "transactions" CASCADE;
  DROP TABLE "payment_slips" CASCADE;
  DROP TABLE "discounts" CASCADE;
  DROP TABLE "discounts_rels" CASCADE;
  DROP TABLE "products_variants" CASCADE;
  DROP TABLE "products_details_dietary" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "_products_v_version_variants" CASCADE;
  DROP TABLE "_products_v_version_details_dietary" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "reviews_rels" CASCADE;
  DROP TABLE "review_media" CASCADE;
  DROP TABLE "categories_breadcrumbs" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "brands" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "concerns" CASCADE;
  DROP TABLE "occasions" CASCADE;
  DROP TABLE "recipients" CASCADE;
  DROP TABLE "stock_movements" CASCADE;
  DROP TABLE "search_queries" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "users_addresses" CASCADE;
  DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_marketing_channels" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "couriers" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "store_settings_announcements" CASCADE;
  DROP TABLE "store_settings" CASCADE;
  DROP TABLE "home_page_rails" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_rels" CASCADE;
  DROP TABLE "checkout_settings_zones_districts" CASCADE;
  DROP TABLE "checkout_settings_zones" CASCADE;
  DROP TABLE "checkout_settings_same_day_districts" CASCADE;
  DROP TABLE "checkout_settings" CASCADE;
  DROP TABLE "payment_settings_cod_excluded_districts" CASCADE;
  DROP TABLE "payment_settings_bank_transfer_accounts" CASCADE;
  DROP TABLE "payment_settings" CASCADE;
  DROP TABLE "policies_non_returnable_types" CASCADE;
  DROP TABLE "policies" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  DROP TYPE "public"."enum_orders_shipping_address_district";
  DROP TYPE "public"."enum_orders_delivery_method";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_payment_method";
  DROP TYPE "public"."enum_orders_payment_status";
  DROP TYPE "public"."enum_returns_reason";
  DROP TYPE "public"."enum_returns_status";
  DROP TYPE "public"."enum_transactions_method";
  DROP TYPE "public"."enum_transactions_kind";
  DROP TYPE "public"."enum_transactions_status";
  DROP TYPE "public"."enum_payment_slips_status";
  DROP TYPE "public"."enum_discounts_mode";
  DROP TYPE "public"."enum_discounts_type";
  DROP TYPE "public"."enum_discounts_applies_to";
  DROP TYPE "public"."enum_products_details_dietary";
  DROP TYPE "public"."enum_products_option_name";
  DROP TYPE "public"."enum_products_option2_name";
  DROP TYPE "public"."enum_products_details_concentration";
  DROP TYPE "public"."enum_products_details_scent_family";
  DROP TYPE "public"."enum_products_details_longevity";
  DROP TYPE "public"."enum_products_details_gender";
  DROP TYPE "public"."enum_products_details_footwear_style";
  DROP TYPE "public"."enum_products_details_size_system";
  DROP TYPE "public"."enum_products_badge";
  DROP TYPE "public"."enum_products_product_type";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum__products_v_version_details_dietary";
  DROP TYPE "public"."enum__products_v_version_option_name";
  DROP TYPE "public"."enum__products_v_version_option2_name";
  DROP TYPE "public"."enum__products_v_version_details_concentration";
  DROP TYPE "public"."enum__products_v_version_details_scent_family";
  DROP TYPE "public"."enum__products_v_version_details_longevity";
  DROP TYPE "public"."enum__products_v_version_details_gender";
  DROP TYPE "public"."enum__products_v_version_details_footwear_style";
  DROP TYPE "public"."enum__products_v_version_details_size_system";
  DROP TYPE "public"."enum__products_v_version_badge";
  DROP TYPE "public"."enum__products_v_version_product_type";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_categories_tint";
  DROP TYPE "public"."enum_brands_group";
  DROP TYPE "public"."enum_stock_movements_reason";
  DROP TYPE "public"."enum_users_addresses_district";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_users_marketing_channels";
  DROP TYPE "public"."enum_audit_logs_action";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_home_page_rails_source";
  DROP TYPE "public"."enum_home_page_rails_style";
  DROP TYPE "public"."enum_home_page_rails_placement";
  DROP TYPE "public"."enum_checkout_settings_zones_districts";
  DROP TYPE "public"."enum_checkout_settings_same_day_districts";
  DROP TYPE "public"."enum_payment_settings_cod_excluded_districts";
  DROP TYPE "public"."enum_payment_settings_mode";
  DROP TYPE "public"."enum_policies_non_returnable_types";`)
}
