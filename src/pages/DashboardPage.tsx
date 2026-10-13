import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, Auction, Bid, WatchlistEntry, Profile } from '@/lib/supabase';
import { formatCurrency, formatTimeRemaining, isAuctionActive, isAuctionEndingSoon, formatDateTime } from '@/lib/utils';
import {
  Gavel, Heart, Clock, TrendingUp, ArrowLeft, Loader2,
  Package, Eye, Trophy, ChevronRight, User as UserIcon, Image as ImageIcon
} from 'lucide-react';

type Props = {
  onNavigate: (page: string, params?: Record<string, string>) => void;
};

type Tab = 'selling' | 'bidding' | 'watchlist';

export default function DashboardPage({ onNavigate }: Props) {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('selling');
  const [myAuctions, setMyAuctions] = useState<(Auction & { bid_count: number })[]>([]);
  const [myBids, setMyBids] = useState<{ auction: Auction; bid: Bid }[]>([]);
  const [watchlist, setWatchlist] = useState<(WatchlistEntry & { auction: Auction })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [auctionsRes, bidsRes, watchRes] = await Promise.all([
      supabase
        .from('auctions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('bids')
        .select(`
          *,
          auction:auctions!bids_auction_id_fkey(*)
        `)
        .eq('bidder_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('watchlist')
        .select(`
          *,
          auction:auctions!watchlist_auction_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    // Get bid counts for my auctions
    if (auctionsRes.data && auctionsRes.data.length > 0) {
      const auctionIds = auctionsRes.data.map((a) => a.id);
      const { data: bidCounts } = await supabase
        .from('bids')
        .select('auction_id')
        .in('auction_id', auctionIds);

      const counts = new Map<string, number>();
      (bidCounts || []).forEach((b: { auction_id: string }) => {
        counts.set(b.auction_id, (counts.get(b.auction_id) || 0) + 1);
      });

      setMyAuctions(auctionsRes.data.map((a) => ({ ...a as Auction, bid_count: counts.get(a.id) || 0 })));
    } else {
      setMyAuctions([]);
    }

    setMyBids(
      (bidsRes.data || []).map((item) => ({
        auction: item.auction as Auction,
        bid: { id: item.id, auction_id: item.auction_id, bidder_id: item.bidder_id, amount: item.amount, created_at: item.created_at } as Bid,
      }))
    );

    setWatchlist(
      (watchRes.data || []).map((item) => ({
        ...item as WatchlistEntry,
        auction: item.auction as Auction,
      }))
    );

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: { id: Tab; label: string; icon: typeof Package; count: number }[] = [
    { id: 'selling', label: 'My Auctions', icon: Package, count: myAuctions.length },
    { id: 'bidding', label: 'My Bids', icon: Gavel, count: myBids.length },
    { id: 'watchlist', label: 'Watchlist', icon: Heart, count: watchlist.length },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => onNavigate('browse')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Auctions
      </button>

      {/* Profile header */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold">
            {profile?.username?.[0]?.toUpperCase() || <UserIcon className="w-7 h-7" />}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{profile?.username || 'User'}</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {profile?.bio && <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>}
          </div>
          <button onClick={() => onNavigate('create')} className="btn-primary">
            <Gavel className="w-4 h-4" /> New Auction
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
              {t.count > 0 && (
                <span className="badge bg-blue-100 text-blue-700 ml-1">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* My Auctions */}
          {tab === 'selling' && (
            <div className="space-y-3">
              {myAuctions.length === 0 ? (
                <EmptyState icon={Package} title="No auctions yet" subtitle="Create your first auction to start selling." action={() => onNavigate('create')} actionLabel="Create Auction" />
              ) : (
                myAuctions.map((auction) => {
                  const active = isAuctionActive(auction.end_time, auction.status);
                  return (
                    <div
                      key={auction.id}
                      onClick={() => onNavigate('auction', { id: auction.id })}
                      className="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {auction.image_url ? (
                          <img src={auction.image_url} alt={auction.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-50">
                            <Gavel className="w-6 h-6 text-blue-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{auction.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{formatCurrency(auction.current_price)}</span>
                          <span>{auction.bid_count} bids</span>
                          <span className={`flex items-center gap-1 ${active && isAuctionEndingSoon(auction.end_time) ? 'text-red-500' : ''}`}>
                            <Clock className="w-3 h-3" /> {active ? formatTimeRemaining(auction.end_time) : 'Ended'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`badge ${active ? 'bg-green-100 text-green-700' : auction.winner_id ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {active ? 'Active' : auction.winner_id ? 'Sold' : 'Ended'}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* My Bids */}
          {tab === 'bidding' && (
            <div className="space-y-3">
              {myBids.length === 0 ? (
                <EmptyState icon={Gavel} title="No bids placed" subtitle="Browse auctions and place your first bid." action={() => onNavigate('browse')} actionLabel="Browse Auctions" />
              ) : (
                myBids.map(({ auction, bid }) => {
                  const active = isAuctionActive(auction.end_time, auction.status);
                  const isWinning = active && auction.current_price === bid.amount && auction.winner_id === user?.id;
                  const isOutbid = active && auction.current_price > bid.amount;
                  return (
                    <div
                      key={bid.id}
                      onClick={() => onNavigate('auction', { id: auction.id })}
                      className="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {auction.image_url ? (
                          <img src={auction.image_url} alt={auction.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-50">
                            <Gavel className="w-6 h-6 text-blue-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{auction.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>Your bid: {formatCurrency(bid.amount)}</span>
                          <span>Current: {formatCurrency(auction.current_price)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isWinning && <span className="badge bg-green-100 text-green-700"><Trophy className="w-3 h-3 mr-1" />Winning</span>}
                        {isOutbid && <span className="badge bg-red-100 text-red-700"><TrendingUp className="w-3 h-3 mr-1" />Outbid</span>}
                        {!active && auction.winner_id === user?.id && <span className="badge bg-amber-100 text-amber-700"><Trophy className="w-3 h-3 mr-1" />Won</span>}
                        {!active && auction.winner_id !== user?.id && <span className="badge bg-gray-100 text-gray-600">Ended</span>}
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Watchlist */}
          {tab === 'watchlist' && (
            <div className="space-y-3">
              {watchlist.length === 0 ? (
                <EmptyState icon={Heart} title="Nothing in watchlist" subtitle="Heart auctions to track them here." action={() => onNavigate('browse')} actionLabel="Browse Auctions" />
              ) : (
                watchlist.map((entry) => {
                  const auction = entry.auction;
                  const active = isAuctionActive(auction.end_time, auction.status);
                  return (
                    <div
                      key={entry.id}
                      onClick={() => onNavigate('auction', { id: auction.id })}
                      className="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {auction.image_url ? (
                          <img src={auction.image_url} alt={auction.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-50">
                            <Gavel className="w-6 h-6 text-blue-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{auction.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{formatCurrency(auction.current_price)}</span>
                          <span className={`flex items-center gap-1 ${active && isAuctionEndingSoon(auction.end_time) ? 'text-red-500' : ''}`}>
                            <Clock className="w-3 h-3" /> {active ? formatTimeRemaining(auction.end_time) : 'Ended'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action, actionLabel }: {
  icon: typeof Package;
  title: string;
  subtitle: string;
  action: () => void;
  actionLabel: string;
}) {
  return (
    <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
      <Icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-600 font-medium">{title}</p>
      <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
      <button onClick={action} className="btn-primary mt-4">
        {actionLabel}
      </button>
    </div>
  );
}
