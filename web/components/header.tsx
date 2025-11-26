'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Wallet, LogOut, LayoutDashboard, Briefcase, Users } from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      router.push('/');
    }
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          RippleFreelance
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link href="/gigs" className="text-gray-700 hover:text-blue-600">
            Browse Gigs
          </Link>
          <Link href="/freelancers" className="text-gray-700 hover:text-blue-600">
            Find Freelancers
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {user?.profile_data?.name || user?.wallet_address.substring(0, 10) + '...'}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Connect Wallet
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
