import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, AuctionWithDetails, WatchlistEntry } from '@/lib/supabase';
import { formatCurrency, formatTimeRemaining, isAuctionActive, isAuctionEndingSoon, CATEGORIES } from '@/lib/utils';
import { Search, Gavel, Heart, TrendingUp, Clock, Filter, ChevronRight, Loader2, Tag } from 'lucide-react';
import AuctionCard from '@/components/AuctionCard';

type SortOption = 'ending_soon' | 'newest' | 'price_low' | 'price_high' | 'most_bids';

export default function BrowsePage({ onNavigate }: { onNavigate: (page: string, params?: Record<string, string>) => void }) {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<AuctionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('ending_soon');
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('auctions')
      .select(`
        *,
        seller:profiles!auctions_seller_id_fkey(username, avatar_url)
      `)
      .eq('status', 'active');

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim}%`);
    }

    switch (sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_low':
        query = query.order('current_price', { ascending: true });
        break;
      case 'price_high':
        query = query.order('current_price', { ascending: false });
        break;
      case 'ending_soon':
        query = query.order('end_time', { ascending: true });
        break;
      case 'most_bids':
        query = query.order('end_time', { ascending: true });
        break;
    }

    const { data, error } = await query.limit(48);

    if (error || !data) {
      setLoading(false);
      return;
    }

    const auctionIds = data.map((a) => a.id);

    const [bidsResult, watchResult] = await Promise.all([
      supabase
        .from('bids')
        .select('auction_id')
        .in('auction_id', auctionIds),
      user
        ? supabase
            .from('watchlist')
            .select('auction_id')
            .eq('user_id', user.id)
            .in('auction_id', auctionIds)
        : Promise.resolve({ data: [] as WatchlistEntry[] | null, error: null }),
    ]);

    const bidCounts = new Map<string, number>();
    (bidsResult.data || []).forEach((b: { auction_id: string }) => {
      bidCounts.set(b.auction_id, (bidCounts.get(b.auction_id) || 0) + 1);
    });

    const watchingSet = new Set((watchResult.data || []).map((w: { auction_id: string }) => w.auction_id));

    let enriched: AuctionWithDetails[] = data.map((a) => ({
      ...a,
      seller: a.seller as AuctionWithDetails['seller'],
      bid_count: bidCounts.get(a.id) || 0,
      is_watching: watchingSet.has(a.id),
    }));

    if (sortBy === 'most_bids') {
      enriched = enriched.sort((a, b) => b.bid_count - a.bid_count);
    }

    setAuctions(enriched);
    setWatchedIds(watchingSet);
    setLoading(false);
  }, [category, search, sortBy, user]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  useEffect(() => {
    const channel = supabase
      .channel('auctions-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auctions' },
        () => { fetchAuctions(); }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' },
        () => { fetchAuctions(); }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' },
        () => { fetchAuctions(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAuctions]);

  const toggleWatch = async (auctionId: string) => {
    if (!user) return;
    if (watchedIds.has(auctionId)) {
      await supabase.from('watchlist').delete().eq('auction_id', auctionId).eq('user_id', user.id);
      setWatchedIds((prev) => { const n = new Set(prev); n.delete(auctionId); return n; });
    } else {
      await supabase.from('watchlist').insert({ auction_id: auctionId, user_id: user.id });
      setWatchedIds((prev) => new Set(prev).add(auctionId));
    }
    setAuctions((prev) =>
      prev.map((a) => ({ ...a, is_watching: watchedIds.has(a.id) === a.is_watching ? !a.is_watching : a.is_watching }))
    );
  };

  const featured = auctions.filter((a) => isAuctionEndingSoon(a.end_time)).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-gray-900 to-blue-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Discover Live Auctions</h1>
              <p className="text-gray-300 mt-2">Bid on unique items from sellers around the world.</p>
            </div>
            <button
              onClick={() => onNavigate('create')}
              className="btn-primary bg-white text-blue-700 hover:bg-blue-50"
            >
              <Gavel className="w-4 h-4" /> Start an Auction
            </button>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search auctions..."
                className="w-full rounded-xl border-0 bg-white/10 backdrop-blur text-white placeholder:text-gray-400 pl-11 pr-4 py-3 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur px-4 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-all"
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 flex flex-wrap gap-3 animate-fade-in">
              <button
                onClick={() => setCategory('all')}
                className={`badge px-3 py-1.5 text-sm ${category === 'all' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              >
                All Categories
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`badge px-3 py-1.5 text-sm ${category === cat ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {featured.length > 0 && category === 'all' && search === '' && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-bold text-gray-900">Ending Soon</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  onNavigate={onNavigate}
                  onToggleWatch={toggleWatch}
                  highlight="ending"
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            All Auctions {auctions.length > 0 && <span className="text-gray-400 font-normal">({auctions.length})</span>}
          </h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
          >
            <option value="ending_soon">Ending Soon</option>
            <option value="newest">Newest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="most_bids">Most Bids</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-20">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No auctions found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {auctions.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                onNavigate={onNavigate}
                onToggleWatch={toggleWatch}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
