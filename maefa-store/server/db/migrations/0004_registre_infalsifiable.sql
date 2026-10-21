CREATE TABLE "mp_ledger" (
	"seq" integer PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"type" text NOT NULL,
	"hash" text NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mp_ledger_type_idx" ON "mp_ledger" USING btree ("type");