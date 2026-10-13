import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, Auction, BidWithDetails, Profile } from '@/lib/supabase';
import { formatCurrency, formatTimeRemaining, isAuctionActive, isAuctionEndingSoon, formatDateTime } from '@/lib/utils';
import {
  Gavel, Clock, Heart, ArrowLeft, TrendingUp, User as UserIcon,
  AlertCircle, Loader2, CheckCircle2, Tag, Trophy, Calendar
} from 'lucide-react';

type Props = {
  auctionId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
};

export default function AuctionDetailPage({ auctionId, onNavigate }: Props) {
  const { user, profile } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [bids, setBids] = useState<BidWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [placingBid, setPlacingBid] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [highestBid, setHighestBid] = useState(0);
  const [imgError, setImgError] = useState(false);

  const fetchAuction = useCallback(async () => {
    const { data: auctionData, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .maybeSingle();

    if (auctionError || !auctionData) {
      setLoading(false);
      return;
    }

    setAuction(auctionData as Auction);
    setHighestBid(auctionData.current_price);

    const { data: sellerData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auctionData.seller_id)
      .maybeSingle();
    setSeller(sellerData as Profile | null);

    const { data: bidsData } = await supabase
      .from('bids')
      .select(`
        *,
        bidder:profiles!bids_bidder_id_fkey(username, avatar_url)
      `)
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })
      .limit(20);

    setBids((bidsData || []) as BidWithDetails[]);

    if (user) {
      const { data: watchData } = await supabase
        .from('watchlist')
        .select('id')
        .eq('auction_id', auctionId)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsWatching(!!watchData);
    }

    setLoading(false);
  }, [auctionId, user]);

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  useEffect(() => {
    if (!auction) return;
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(auction.end_time));
    }, 1000);
    setTimeRemaining(formatTimeRemaining(auction.end_time));
    return () => clearInterval(interval);
  }, [auction]);

  useEffect(() => {
    if (!auctionId) return;
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionId}` },
        () => { fetchAuction(); }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
        (payload) => { setAuction(payload.new as Auction); setHighestBid((payload.new as Auction).current_price); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [auctionId, fetchAuction]);

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auction) return;
    setBidError(null);
    setBidSuccess(null);

    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) {
      setBidError('Enter a valid bid amount.');
      return;
    }

    const minBid = auction.current_price + auction.min_bid_increment;
    if (amount < minBid) {
      setBidError(`Minimum bid is ${formatCurrency(minBid)}.`);
      return;
    }

    if (user.id === auction.seller_id) {
      setBidError('You cannot bid on your own auction.');
      return;
    }

    if (!isAuctionActive(auction.end_time, auction.status)) {
      setBidError('This auction has ended.');
      return;
    }

    setPlacingBid(true);
    const { error } = await supabase
      .from('bids')
      .insert({ auction_id: auctionId, bidder_id: user.id, amount });

    if (error) {
      setBidError(error.message);
    } else {
      setBidSuccess(`Bid of ${formatCurrency(amount)} placed successfully!`);
      setBidAmount('');
      setHighestBid(amount);
      fetchAuction();
      setTimeout(() => setBidSuccess(null), 4000);
    }
    setPlacingBid(false);
  };

  const toggleWatch = async () => {
    if (!user) return;
    if (isWatching) {
      await supabase.from('watchlist').delete().eq('auction_id', auctionId).eq('user_id', user.id);
      setIsWatching(false);
    } else {
      await supabase.from('watchlist').insert({ auction_id: auctionId, user_id: user.id });
      setIsWatching(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Auction not found</p>
        <button onClick={() => onNavigate('browse')} className="btn-primary mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Auctions
        </button>
      </div>
    );
  }

  const active = isAuctionActive(auction.end_time, auction.status);
  const endingSoon = isAuctionEndingSoon(auction.end_time);
  const isOwner = user?.id === auction.seller_id;
  const minBid = auction.current_price + auction.min_bid_increment;
  const youAreWinner = auction.winner_id === user?.id && !active;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => onNavigate('browse')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Auctions
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm aspect-square">
          {auction.image_url && !imgError ? (
            <img src={auction.image_url} alt={auction.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
              <Gavel className="w-16 h-16 text-blue-300" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="badge bg-white/90 backdrop-blur text-gray-700">{auction.category}</span>
            {endingSoon && active && (
              <span className="badge bg-red-500 text-white animate-pulse-glow">
                <Clock className="w-3 h-3 mr-1" /> Ending Soon
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{auction.title}</h1>

          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <UserIcon className="w-4 h-4" />
              <span>{seller?.username || 'Unknown seller'}</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Started {formatDateTime(auction.start_time)}</span>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Current Bid</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(highestBid)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{bids.length} bids</p>
                <p className={`text-lg font-bold ${active ? (endingSoon ? 'text-red-500' : 'text-blue-600') : 'text-gray-400'}`}>
                  {active ? timeRemaining : 'Ended'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Tag className="w-3.5 h-3.5" /> Start: {formatCurrency(auction.starting_price)}
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <TrendingUp className="w-3.5 h-3.5" /> Min increment: {formatCurrency(auction.min_bid_increment)}
              </div>
            </div>
          </div>

          {/* Bid form */}
          {active && !isOwner && (
            <form onSubmit={handleBid} className="mt-4">
              {bidError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3 animate-fade-in">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{bidError}</span>
                </div>
              )}
              {bidSuccess && (
                <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 mb-3 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{bidSuccess}</span>
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Min: ${formatCurrency(minBid)}`}
                    className="input-field text-lg font-semibold"
                    disabled={placingBid}
                  />
                </div>
                <button
                  type="submit"
                  disabled={placingBid || !user}
                  className="btn-primary text-base px-6"
                >
                  {placingBid ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Gavel className="w-4 h-4" /> Place Bid</>}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setBidAmount(minBid.toFixed(2))}
                className="text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium"
              >
                Bid {formatCurrency(minBid)}
              </button>
            </form>
          )}

          {active && isOwner && (
            <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
              <CheckCircle2 className="w-4 h-4 inline mr-2" />
              This is your auction. You can't bid on it, but you can watch bids come in real-time.
            </div>
          )}

          {youAreWinner && (
            <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2 animate-fade-in">
              <Trophy className="w-5 h-5" />
              <span>Congratulations! You won this auction!</span>
            </div>
          )}

          {!active && !youAreWinner && auction.winner_id && (
            <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>This auction has ended. Winner: {bids[0]?.bidder?.username || 'Unknown'}</span>
            </div>
          )}

          {!active && !auction.winner_id && (
            <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
              This auction has ended with no bids.
            </div>
          )}

          <button
            onClick={toggleWatch}
            disabled={!user}
            className="btn-secondary mt-3 w-full"
          >
            <Heart className={`w-4 h-4 ${isWatching ? 'text-red-500 fill-red-500' : ''}`} />
            {isWatching ? 'Watching' : 'Add to Watchlist'}
          </button>

          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{auction.description}</p>
          </div>
        </div>
      </div>

      {/* Bid history */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Bid History</h2>
        {bids.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200">
            <Gavel className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No bids yet. Be the first to bid!</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {bids.map((bid, i) => (
              <div key={bid.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {bid.bidder?.username || 'Anonymous'}
                      {i === 0 && <span className="text-amber-600 ml-2">Highest</span>}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(bid.created_at)}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(bid.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
