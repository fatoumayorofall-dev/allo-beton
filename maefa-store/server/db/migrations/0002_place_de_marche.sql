CREATE TABLE "mp_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"status" text NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "prix_positif" CHECK ("mp_listings"."price" > 0),
	CONSTRAINT "statut_annonce" CHECK ("mp_listings"."status" in ('en_attente', 'publiee', 'refusee', 'retiree'))
);
--> statement-breakpoint
CREATE TABLE "mp_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"buyer_phone" text,
	"status" text NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mp_sellers" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_phone" text,
	"slug" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "statut_vendeur" CHECK ("mp_sellers"."status" in ('en_attente', 'active', 'suspendue', 'fermee'))
);
--> statement-breakpoint
ALTER TABLE "mp_listings" ADD CONSTRAINT "mp_listings_seller_id_mp_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."mp_sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_orders" ADD CONSTRAINT "mp_orders_seller_id_mp_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."mp_sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_listings_seller_idx" ON "mp_listings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "mp_listings_status_idx" ON "mp_listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mp_orders_seller_idx" ON "mp_orders" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "mp_orders_buyer_idx" ON "mp_orders" USING btree ("buyer_phone");--> statement-breakpoint
CREATE INDEX "mp_orders_status_idx" ON "mp_orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_sellers_slug_idx" ON "mp_sellers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "mp_sellers_owner_idx" ON "mp_sellers" USING btree ("owner_phone");