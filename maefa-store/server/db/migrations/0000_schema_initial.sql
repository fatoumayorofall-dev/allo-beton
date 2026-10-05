CREATE TABLE "account_orders" (
	"customer_phone" text NOT NULL,
	"order_id" text NOT NULL,
	"position" integer NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "account_orders_customer_phone_order_id_pk" PRIMARY KEY("customer_phone","order_id")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb
);
--> statement-breakpoint
CREATE TABLE "auth_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" text NOT NULL,
	"customer_phone" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"label" text,
	"landmark" text,
	"accuracy" double precision,
	"source" text,
	CONSTRAINT "customer_addresses_customer_phone_id_pk" PRIMARY KEY("customer_phone","id"),
	CONSTRAINT "lat_valide" CHECK ("customer_addresses"."lat" between -90 and 90),
	CONSTRAINT "lng_valide" CHECK ("customer_addresses"."lng" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"phone" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"pin_hash" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"order_id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"order_id" text NOT NULL,
	"position" integer NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"size" text,
	"color" text,
	CONSTRAINT "order_items_order_id_position_pk" PRIMARY KEY("order_id","position")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"payment_method" text,
	"payment_status" text,
	"subtotal" integer,
	"discount" integer,
	"delivery_fee" integer,
	"total" integer NOT NULL,
	"zone" text,
	"customer_phone" text,
	"request_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "total_positif" CHECK ("orders"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"old_price" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"preorder_days" integer,
	"data" jsonb NOT NULL,
	CONSTRAINT "prix_positif" CHECK ("products"."price" > 0),
	CONSTRAINT "stock_positif" CHECK ("products"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"total" integer NOT NULL,
	"order_id" text,
	"customer_phone" text,
	"data" jsonb NOT NULL,
	CONSTRAINT "statut_demande" CHECK ("purchase_requests"."status" in ('nouvelle', 'disponible', 'indisponible', 'commandee'))
);
--> statement-breakpoint
CREATE TABLE "request_items" (
	"request_id" text NOT NULL,
	"position" integer NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"catalog_price" integer,
	"quantity" integer NOT NULL,
	"size" text,
	"color" text,
	CONSTRAINT "request_items_request_id_position_pk" PRIMARY KEY("request_id","position"),
	CONSTRAINT "quantite_demande" CHECK ("request_items"."quantity" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"customer_phone" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"contact" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_orders" ADD CONSTRAINT "account_orders_customer_phone_customers_phone_fk" FOREIGN KEY ("customer_phone") REFERENCES "public"."customers"("phone") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_phone_customers_phone_fk" FOREIGN KEY ("customer_phone") REFERENCES "public"."customers"("phone") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_customer_phone_customers_phone_fk" FOREIGN KEY ("customer_phone") REFERENCES "public"."customers"("phone") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "requests_status_idx" ON "purchase_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_customer_idx" ON "sessions" USING btree ("customer_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "tours_token_idx" ON "tours" USING btree ("token");