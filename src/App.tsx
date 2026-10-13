import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import AuthPage from '@/pages/AuthPage';
import BrowsePage from '@/pages/BrowsePage';
import AuctionDetailPage from '@/pages/AuctionDetailPage';
import CreateAuctionPage from '@/pages/CreateAuctionPage';
import DashboardPage from '@/pages/DashboardPage';

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('browse');
  const [params, setParams] = useState<Record<string, string>>({});

  const navigate = (newPage: string, newParams?: Record<string, string>) => {
    setPage(newPage);
    setParams(newParams || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!loading && !user && (page === 'create' || page === 'dashboard')) {
      setPage('auth');
    }
  }, [user, loading, page]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && page !== 'auth') {
    return (
      <>
        <Navbar onNavigate={navigate} currentPage={page} />
        <BrowsePage onNavigate={navigate} />
      </>
    );
  }

  if (!user && page === 'auth') {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onNavigate={navigate} currentPage={page} />
      {page === 'browse' && <BrowsePage onNavigate={navigate} />}
      {page === 'auction' && params.id && <AuctionDetailPage auctionId={params.id} onNavigate={navigate} />}
      {page === 'create' && user && <CreateAuctionPage onNavigate={navigate} />}
      {page === 'dashboard' && user && <DashboardPage onNavigate={navigate} />}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-400">
          BidHive — Real-time online auctions. Bid smart, win big.
        </div>
      </footer>
    </div>
  );
}
