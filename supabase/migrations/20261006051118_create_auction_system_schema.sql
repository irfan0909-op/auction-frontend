/*
# Create Auction System Schema

1. Overview
This migration creates the complete database schema for a real-time online auction and bidding system.
Users can create auctions, place bids, watch auctions, and track their activity.

2. New Tables
- `profiles`: Extended user profile data linked to auth.users (username, avatar URL, bio)
- `auctions`: Auction listings with title, description, images, pricing, and timing
- `bids`: Individual bids placed by users on auctions
- `watchlist`: Auctions that users are tracking/watching

3. Table Details

  profiles:
  - id (uuid, PK, FK to auth.users)
  - username (text, unique, not null)
  - avatar_url (text, nullable)
  - bio (text, nullable)
  - created_at (timestamptz, default now())

  auctions:
  - id (uuid, PK)
  - seller_id (uuid, FK to auth.users, not null, default auth.uid())
  - title (text, not null)
  - description (text, not null)
  - category (text, not null)
  - image_url (text, nullable)
  - starting_price (numeric, not null, default 0)
  - current_price (numeric, not null, default starting_price)
  - reserve_price (numeric, nullable)
  - min_bid_increment (numeric, not null, default 1)
  - status (text, not null, default 'active' — values: active, ended, cancelled)
  - start_time (timestamptz, not null, default now())
  - end_time (timestamptz, not null)
  - winner_id (uuid, FK to auth.users, nullable)
  - created_at (timestamptz, default now())

  bids:
  - id (uuid, PK)
  - auction_id (uuid, FK to auctions, not null)
  - bidder_id (uuid, FK to auth.users, not null, default auth.uid())
  - amount (numeric, not null)
  - created_at (timestamptz, default now())

  watchlist:
  - id (uuid, PK)
  - user_id (uuid, FK to auth.users, not null, default auth.uid())
  - auction_id (uuid, FK to auctions, not null)
  - created_at (timestamptz, default now())

4. Indexes
- Index on auctions.status and auctions.end_time for active listing queries
- Index on bids.auction_id for fetching bids per auction
- Index on watchlist.user_id for user watchlist queries
- Index on auctions.seller_id for seller's auctions

5. Security (RLS)
- profiles: users can read all profiles, update only their own
- auctions: all authenticated users can read; sellers can insert/update/delete their own
- bids: all authenticated users can read; users can insert their own bids, delete their own bids
- watchlist: users can read/insert/delete only their own watchlist entries

6. Important Notes
- All owner columns default to auth.uid() so inserts work from the client without passing user_id
- Cascade deletes: deleting an auction removes its bids and watchlist entries
- Unique constraint on watchlist prevents duplicate entries
- Current price on auctions updates automatically via trigger when a new high bid is placed
- Trigger also updates auction winner_id to highest bidder
*/

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ==================== AUCTIONS ====================
CREATE TABLE IF NOT EXISTS auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  image_url text,
  starting_price numeric(12,2) NOT NULL DEFAULT 0,
  current_price numeric(12,2) NOT NULL DEFAULT 0,
  reserve_price numeric(12,2),
  min_bid_increment numeric(12,2) NOT NULL DEFAULT 1.00,
  status text NOT NULL DEFAULT 'active',
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL,
  winner_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auctions_select_all" ON auctions;
CREATE POLICY "auctions_select_all" ON auctions FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auctions_insert_own" ON auctions;
CREATE POLICY "auctions_insert_own" ON auctions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "auctions_update_own" ON auctions;
CREATE POLICY "auctions_update_own" ON auctions FOR UPDATE
TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "auctions_delete_own" ON auctions;
CREATE POLICY "auctions_delete_own" ON auctions FOR DELETE
TO authenticated USING (auth.uid() = seller_id);

-- ==================== BIDS ====================
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bids_select_all" ON bids;
CREATE POLICY "bids_select_all" ON bids FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "bids_insert_own" ON bids;
CREATE POLICY "bids_insert_own" ON bids FOR INSERT
TO authenticated WITH CHECK (auth.uid() = bidder_id);

DROP POLICY IF EXISTS "bids_delete_own" ON bids;
CREATE POLICY "bids_delete_own" ON bids FOR DELETE
TO authenticated USING (auth.uid() = bidder_id);

-- ==================== WATCHLIST ====================
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, auction_id)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "watchlist_select_own" ON watchlist;
CREATE POLICY "watchlist_select_own" ON watchlist FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "watchlist_insert_own" ON watchlist;
CREATE POLICY "watchlist_insert_own" ON watchlist FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "watchlist_delete_own" ON watchlist;
CREATE POLICY "watchlist_delete_own" ON watchlist FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_auctions_status_endtime ON auctions(status, end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);

-- ==================== TRIGGERS ====================
-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update current_price and winner_id on new bid
CREATE OR REPLACE FUNCTION public.update_auction_on_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.auctions
  SET current_price = new.amount,
      winner_id = new.bidder_id
  WHERE id = new.auction_id
    AND new.amount > current_price;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_bid_inserted ON bids;
CREATE TRIGGER on_bid_inserted
  AFTER INSERT ON bids
  FOR EACH ROW EXECUTE FUNCTION public.update_auction_on_bid();