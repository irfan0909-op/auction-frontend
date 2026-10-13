import { AuctionWithDetails } from '@/lib/supabase';
import { formatCurrency, formatTimeRemaining, isAuctionActive, isAuctionEndingSoon } from '@/lib/utils';
import { Heart, Clock, Gavel, ChevronRight, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

type Props = {
  auction: AuctionWithDetails;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onToggleWatch: (auctionId: string) => void;
  highlight?: 'ending' | null;
};

export default function AuctionCard({ auction, onNavigate, onToggleWatch, highlight }: Props) {
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(auction.end_time));
  const [imgError, setImgError] = useState(false);
  const active = isAuctionActive(auction.end_time, auction.status);
  const endingSoon = isAuctionEndingSoon(auction.end_time);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(auction.end_time));
    }, 1000);
    return () => clearInterval(interval);
  }, [auction.end_time]);

  return (
    <div
      onClick={() => onNavigate('auction', { id: auction.id })}
      className={`card group cursor-pointer overflow-hidden hover:shadow-lg hover:border-blue-300 ${highlight === 'ending' ? 'ring-2 ring-red-400/50' : ''}`}
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {auction.image_url && !imgError ? (
          <img
            src={auction.image_url}
            alt={auction.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
            <Gavel className="w-10 h-10 text-blue-300" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-2">
          {endingSoon && active && (
            <span className="badge bg-red-500 text-white">
              <Clock className="w-3 h-3 mr-1" /> Ending Soon
            </span>
          )}
          <span className="badge bg-white/90 backdrop-blur text-gray-700">
            {auction.category}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatch(auction.id);
          }}
          className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          <Heart
            className={`w-4 h-4 transition-all ${
              auction.is_watching ? 'text-red-500 fill-red-500' : 'text-gray-400'
            }`}
          />
        </button>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {auction.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 mt-1 min-h-[2.5rem]">
          {auction.description}
        </p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Current Bid</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(auction.current_price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{auction.bid_count} bids</p>
            <p className={`text-sm font-semibold ${endingSoon && active ? 'text-red-500' : active ? 'text-gray-600' : 'text-gray-400'}`}>
              {active ? timeRemaining : 'Ended'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            by {auction.seller?.username || 'Unknown'}
          </span>
          <span className="inline-flex items-center text-xs font-medium text-blue-600 group-hover:gap-2 gap-1 transition-all">
            View <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
