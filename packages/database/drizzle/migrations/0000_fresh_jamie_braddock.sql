CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"avatar_url" varchar(500),
	"settings" jsonb DEFAULT '{}'::jsonb,
	"timezone" varchar(50) DEFAULT 'UTC',
	"is_active" boolean DEFAULT true,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mt5_login" integer NOT NULL,
	"mt5_server" varchar(100) NOT NULL,
	"account_name" varchar(100),
	"balance" numeric(18, 2) DEFAULT '0',
	"equity" numeric(18, 2) DEFAULT '0',
	"margin" numeric(18, 2) DEFAULT '0',
	"free_margin" numeric(18, 2) DEFAULT '0',
	"margin_level" numeric(10, 2) DEFAULT '0',
	"is_connected" boolean DEFAULT false,
	"is_primary" boolean DEFAULT false,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"refresh_token" varchar(500),
	"user_agent" text,
	"ip_address" varchar(50),
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"mt5_ticket" integer,
	"symbol" varchar(10) NOT NULL,
	"type" varchar(10) NOT NULL,
	"kind" varchar(10) NOT NULL,
	"volume" numeric(10, 2) NOT NULL,
	"price" numeric(18, 5) NOT NULL,
	"stop_loss" numeric(18, 5),
	"take_profit" numeric(18, 5),
	"deviation" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"comment" text,
	"reason" varchar(50),
	"filled_price" numeric(18, 5),
	"filled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"mt5_ticket" integer NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"type" varchar(10) NOT NULL,
	"volume" numeric(10, 2) NOT NULL,
	"price_open" numeric(18, 5) NOT NULL,
	"price_current" numeric(18, 5) NOT NULL,
	"stop_loss" numeric(18, 5),
	"take_profit" numeric(18, 5),
	"profit" numeric(18, 2) DEFAULT '0',
	"commission" numeric(18, 2) DEFAULT '0',
	"swap" numeric(18, 2) DEFAULT '0',
	"comment" text,
	"magic" integer,
	"opened_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "positions_mt5_ticket_unique" UNIQUE("mt5_ticket")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"mt5_ticket" integer NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"type" varchar(10) NOT NULL,
	"volume" numeric(10, 2) NOT NULL,
	"price_open" numeric(18, 5) NOT NULL,
	"price_close" numeric(18, 5) NOT NULL,
	"stop_loss" numeric(18, 5),
	"take_profit" numeric(18, 5),
	"profit" numeric(18, 2) NOT NULL,
	"commission" numeric(18, 2) DEFAULT '0',
	"swap" numeric(18, 2) DEFAULT '0',
	"comment" text,
	"magic" integer,
	"is_win" boolean,
	"pips" numeric(10, 1),
	"duration_minutes" integer,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trades_mt5_ticket_unique" UNIQUE("mt5_ticket")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "symbols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(10) NOT NULL,
	"description" varchar(255),
	"category" varchar(50) DEFAULT 'forex',
	"digits" integer DEFAULT 5 NOT NULL,
	"contract_size" numeric(10, 2) DEFAULT '100000',
	"tick_value" numeric(18, 8),
	"tick_size" numeric(18, 8),
	"spread_min" numeric(10, 1),
	"spread_avg" numeric(10, 1),
	"swap_long" numeric(10, 2),
	"swap_short" numeric(10, 2),
	"margin_hedge" numeric(5, 2) DEFAULT '0.5',
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "symbols_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" varchar(50) DEFAULT 'manual',
	"timeframe" varchar(20),
	"parameters" jsonb DEFAULT '{}'::jsonb,
	"risk_settings" jsonb,
	"is_active" boolean DEFAULT true,
	"is_backtested" boolean DEFAULT false,
	"win_rate" numeric(5, 2),
	"profit_factor" numeric(5, 2),
	"sharpe_ratio" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "candles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"timeframe" varchar(10) NOT NULL,
	"timestamp" timestamp (3) with time zone NOT NULL,
	"open" numeric(18, 5) NOT NULL,
	"high" numeric(18, 5) NOT NULL,
	"low" numeric(18, 5) NOT NULL,
	"close" numeric(18, 5) NOT NULL,
	"volume" numeric(18, 3) NOT NULL,
	"tick_volume" integer,
	"spread" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"strategy_id" uuid,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"timeframe" varchar(10),
	"direction" varchar(10),
	"confidence" numeric(5, 2) NOT NULL,
	"start_timestamp" timestamp with time zone NOT NULL,
	"end_timestamp" timestamp with time zone,
	"price_at_detection" numeric(18, 5),
	"description" text,
	"parameters" text,
	"image_url" varchar(500),
	"is_confirmed" boolean DEFAULT false,
	"outcome" varchar(20),
	"profit_at_completion" numeric(18, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trades" ADD CONSTRAINT "trades_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strategies" ADD CONSTRAINT "strategies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patterns" ADD CONSTRAINT "patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patterns" ADD CONSTRAINT "patterns_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "candles_symbol_timeframe_timestamp_idx" ON "candles" ("symbol","timeframe","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "candles_symbol_timeframe_idx" ON "candles" ("symbol","timeframe");