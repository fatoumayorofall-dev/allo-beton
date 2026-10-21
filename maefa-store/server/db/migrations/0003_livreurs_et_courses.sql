CREATE TABLE "mp_drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_phone" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "statut_livreur" CHECK ("mp_drivers"."status" in ('en_attente', 'active', 'suspendue', 'fermee'))
);
--> statement-breakpoint
CREATE TABLE "mp_trips" (
	"id" text PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"driver_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "mode_course" CHECK ("mp_trips"."mode" in ('express', 'partagee'))
);
--> statement-breakpoint
ALTER TABLE "mp_trips" ADD CONSTRAINT "mp_trips_driver_id_mp_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."mp_drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_drivers_owner_idx" ON "mp_drivers" USING btree ("owner_phone");--> statement-breakpoint
CREATE INDEX "mp_trips_status_idx" ON "mp_trips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mp_trips_driver_idx" ON "mp_trips" USING btree ("driver_id");