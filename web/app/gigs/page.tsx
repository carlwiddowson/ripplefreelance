'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gigsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface Gig {
  id: string;
  freelancer_id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  price_usd: number;
  estimated_delivery_days: number;
  milestones: any[];
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export default function GigsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'open' | 'in_progress' | 'completed' | 'cancelled' | ''>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    skills: '',
    price_usd: '',
    estimated_delivery_days: '',
  });

  useEffect(() => {
    loadGigs();
  }, [category, status]);

  const loadGigs = async () => {
    try {
      setLoading(true);
      const response = await gigsApi.listGigs({
        category: category || undefined,
        status: status || undefined,
      });
      setGigs(response.data.gigs);
    } catch (error) {
      console.error('Failed to load gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await gigsApi.createGig({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        price_usd: parseFloat(formData.price_usd),
        estimated_delivery_days: parseInt(formData.estimated_delivery_days),
      });
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        category: '',
        skills: '',
        price_usd: '',
        estimated_delivery_days: '',
      });
      loadGigs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create gig');
    }
  };

  const handleDeleteGig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gig?')) return;
    try {
      await gigsApi.deleteGig(id);
      loadGigs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete gig');
    }
  };

  const canCreateGig = isAuthenticated && (user?.role === 'freelancer' || user?.role === 'both');

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Browse Gigs</h1>
            <p className="text-gray-600">
              Discover freelance opportunities powered by XRPL
            </p>
          </div>
          {canCreateGig && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Gig
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Filter by category..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Gigs List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading gigs...</p>
          </div>
        ) : gigs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-xl font-bold mb-2">No gigs found</h2>
            <p className="text-gray-600">
              {canCreateGig ? 'Be the first to create a gig!' : 'Check back later for new opportunities.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gigs.map((gig) => (
              <div key={gig.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold">{gig.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    gig.status === 'open' ? 'bg-green-100 text-green-800' :
                    gig.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    gig.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {gig.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-4 line-clamp-3">{gig.description}</p>
                <div className="mb-4">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                    {gig.category}
                  </span>
                  {gig.skills.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mr-2">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">${gig.price_usd}</p>
                    <p className="text-sm text-gray-500">{gig.estimated_delivery_days} days</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/gigs/${gig.id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                    {isAuthenticated && user?.id === gig.freelancer_id && gig.status === 'open' && (
                      <button
                        onClick={() => handleDeleteGig(gig.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Gig Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">Create New Gig</h2>
            <form onSubmit={handleCreateGig}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={255}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  minLength={20}
                  maxLength={5000}
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Web Development, Design, Writing"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., React, Node.js, TypeScript"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.price_usd}
                    onChange={(e) => setFormData({ ...formData, price_usd: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Days *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="365"
                    value={formData.estimated_delivery_days}
                    onChange={(e) => setFormData({ ...formData, estimated_delivery_days: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Gig
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
