/*
# Allow anonymous users to browse auctions and bids

1. Problem
- Auctions and bids SELECT policies are scoped to `authenticated` only
- New users who haven't signed in, or anyone visiting the site, see zero auctions
- The app should let anyone browse auctions publicly (sign-in only needed to bid/create)

2. Changes
- auctions: change SELECT policy to allow anon + authenticated
- bids: change SELECT policy to allow anon + authenticated (bid history is public)
- profiles: change SELECT policy to allow anon + authenticated (seller names visible on listings)
- INSERT/UPDATE/DELETE policies remain authenticated-only (no change)

3. Security
- Reading auctions, bids, and profiles is now public (anon + authenticated)
- Writing (creating auctions, placing bids, editing) still requires authentication
- Watchlist remains private to each user (no change)
*/

-- Auctions: allow anyone to read
DROP POLICY IF EXISTS "auctions_select_all" ON auctions;
CREATE POLICY "auctions_select_all" ON auctions FOR SELECT
TO anon, authenticated USING (true);

-- Bids: allow anyone to read (public bid history)
DROP POLICY IF EXISTS "bids_select_all" ON bids;
CREATE POLICY "bids_select_all" ON bids FOR SELECT
TO anon, authenticated USING (true);

-- Profiles: allow anyone to read (seller usernames on listings)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
TO anon, authenticated USING (true);