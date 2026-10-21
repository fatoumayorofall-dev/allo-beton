CREATE TABLE "mp_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mp_chats" ADD CONSTRAINT "mp_chats_seller_id_mp_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."mp_sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_chats_seller_idx" ON "mp_chats" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "mp_chats_buyer_idx" ON "mp_chats" USING btree ("buyer_phone");