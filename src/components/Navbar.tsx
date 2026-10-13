import { useAuth } from '@/context/AuthContext';
import { Gavel, Home, Plus, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';

type Props = {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  currentPage: string;
};

export default function Navbar({ onNavigate, currentPage }: Props) {
  const { user, profile, signOut } = useAuth();

  const navItems = [
    { id: 'browse', label: 'Browse', icon: Home },
    { id: 'create', label: 'Sell', icon: Plus },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate('browse')}
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center group-hover:bg-blue-700 transition-colors">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">BidHive</span>
          </button>

          {/* Nav items */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                    {profile?.username?.[0]?.toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[100px] truncate">
                    {profile?.username || 'User'}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button onClick={() => onNavigate('auth')} className="btn-primary">
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
