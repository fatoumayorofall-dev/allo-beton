CREATE TABLE "product_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"rating" integer,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "note_valide" CHECK ("product_comments"."rating" is null or "product_comments"."rating" between 1 and 5),
	CONSTRAINT "statut_avis" CHECK ("product_comments"."status" in ('publie', 'masque'))
);
--> statement-breakpoint
CREATE INDEX "comments_product_idx" ON "product_comments" USING btree ("product_id");