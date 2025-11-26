'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { Briefcase, CheckCircle, Star, MessageSquare } from 'lucide-react';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await authApi.getMe();
        setStats(res.data.stats);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-8">
          Welcome back, {user?.profile_data?.name || 'User'}!
        </p>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Your Profile</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Wallet Address</p>
              <p className="font-mono text-sm">{user?.wallet_address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="capitalize">{user?.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Reputation Score</p>
              <p>{user?.reputation_score || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Verified</p>
              <p>{user?.is_verified ? '✓ Verified' : 'Not Verified'}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm mb-1">Total Gigs</p>
            <p className="text-3xl font-bold text-blue-600">{stats?.total_gigs || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-600">{stats?.completed_gigs || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm mb-1">Average Rating</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats?.average_rating ? stats.average_rating.toFixed(1) : '0.0'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm mb-1">Reviews</p>
            <p className="text-3xl font-bold text-purple-600">{stats?.total_reviews || 0}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button className="p-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50">
              Post a Gig
            </button>
            <button className="p-4 border-2 border-green-600 text-green-600 rounded-lg font-semibold hover:bg-green-50">
              Browse Gigs
            </button>
            <button className="p-4 border-2 border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-50">
              View Escrows
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
