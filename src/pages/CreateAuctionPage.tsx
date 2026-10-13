import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/utils';
import {
  Gavel, Image as ImageIcon, AlertCircle, Loader2, CheckCircle2,
  ArrowLeft, Tag, Clock, DollarSign, FileText, Upload, X
} from 'lucide-react';

type Props = {
  onNavigate: (page: string, params?: Record<string, string>) => void;
};

export default function CreateAuctionPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [startingPrice, setStartingPrice] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [minBidIncrement, setMinBidIncrement] = useState('1.00');
  const [duration, setDuration] = useState('3');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5 MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    setError(null);
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('auction-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('auction-images')
      .getPublicUrl(fileName);

    setImageUrl(urlData.publicUrl);
    setImagePreview(URL.createObjectURL(file));
    setUploading(false);
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) return;

    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }

    const startPrice = parseFloat(startingPrice);
    if (isNaN(startPrice) || startPrice < 0) {
      setError('Enter a valid starting price.');
      return;
    }

    const increment = parseFloat(minBidIncrement);
    if (isNaN(increment) || increment <= 0) {
      setError('Enter a valid minimum bid increment.');
      return;
    }

    const durationHours = parseFloat(duration);
    if (isNaN(durationHours) || durationHours <= 0) {
      setError('Auction duration must be greater than 0.');
      return;
    }

    let reserve: number | null = null;
    if (reservePrice.trim()) {
      reserve = parseFloat(reservePrice);
      if (isNaN(reserve) || reserve < 0) {
        setError('Enter a valid reserve price or leave it empty.');
        return;
      }
    }

    setLoading(true);

    const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

    const { data, error: insertError } = await supabase
      .from('auctions')
      .insert({
        seller_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        image_url: imageUrl.trim() || null,
        starting_price: startPrice,
        current_price: startPrice,
        reserve_price: reserve,
        min_bid_increment: increment,
        status: 'active',
        start_time: new Date().toISOString(),
        end_time: endTime,
      })
      .select('id')
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setSuccess('Auction created successfully!');
    setLoading(false);

    setTimeout(() => {
      onNavigate('auction', { id: data.id });
    }, 1200);
  };

  const durationOptions = [
    { label: '1 Hour', value: '1' },
    { label: '6 Hours', value: '6' },
    { label: '12 Hours', value: '12' },
    { label: '1 Day', value: '24' },
    { label: '3 Days', value: '72' },
    { label: '7 Days', value: '168' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => onNavigate('browse')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Auctions
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Gavel className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create an Auction</h1>
          <p className="text-sm text-gray-500">List your item and start receiving bids.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <FileText className="w-3.5 h-3.5 inline mr-1" /> Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Vintage Rolex Submariner Watch"
            className="input-field"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Tag className="w-3.5 h-3.5 inline mr-1" /> Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your item in detail — condition, provenance, authenticity, shipping details..."
            rows={5}
            className="input-field resize-none"
            required
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <ImageIcon className="w-3.5 h-3.5 inline mr-1" /> Auction Image
          </label>
          {imagePreview ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 group">
              <img src={imagePreview} alt="Preview" className="w-full max-h-56 object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-black/80 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all">
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
                )}
                <p className="text-sm text-gray-500 font-medium">
                  {uploading ? 'Uploading...' : 'Click to upload an image'}
                </p>
                <p className="text-xs text-gray-400">PNG, JPG up to 5 MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Starting Price
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              placeholder="50.00"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Bid Increment</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={minBidIncrement}
              onChange={(e) => setMinBidIncrement(e.target.value)}
              className="input-field"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Reserve Price <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={reservePrice}
            onChange={(e) => setReservePrice(e.target.value)}
            placeholder="No reserve"
            className="input-field"
          />
          <p className="text-xs text-gray-400 mt-1">Minimum price for the auction to sell. Not visible to bidders.</p>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Clock className="w-3.5 h-3.5 inline mr-1" /> Auction Duration
          </label>
          <div className="grid grid-cols-3 gap-2">
            {durationOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDuration(opt.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                  duration === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 animate-fade-in">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full text-base"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Gavel className="w-5 h-5" /> Launch Auction</>}
        </button>
      </form>
    </div>
  );
}
