import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type Auction = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  starting_price: number;
  current_price: number;
  reserve_price: number | null;
  min_bid_increment: number;
  status: string;
  start_time: string;
  end_time: string;
  winner_id: string | null;
  created_at: string;
};

export type Bid = {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
};

export type WatchlistEntry = {
  id: string;
  user_id: string;
  auction_id: string;
  created_at: string;
};

export type AuctionWithDetails = Auction & {
  seller: Profile | null;
  bid_count: number;
  is_watching: boolean;
};

export type BidWithDetails = Bid & {
  bidder: Profile | null;
};
