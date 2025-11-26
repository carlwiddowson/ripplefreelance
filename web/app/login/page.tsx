'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get challenge
      const challengeRes = await authApi.getChallenge(walletAddress);
      const message = challengeRes.data.message;

      // In a real implementation, this would use Xaman SDK
      // For demo purposes, we'll simulate the signature
      alert(`Please sign this message in your XRPL wallet:\n\n${message}\n\nFor demo: Using simulated signature`);
      
      const mockSignature = 'mock_signature_' + Math.random().toString(36).substring(7);

      // Authenticate
      const authRes = await authApi.connectWallet({
        wallet_address: walletAddress,
        signature: mockSignature,
        message,
        role: 'both',
      });

      if (authRes.data.token && authRes.data.user) {
        setAuth(authRes.data.user, authRes.data.token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Connect Wallet</h1>
        <p className="text-gray-600 text-center mb-8">
          Sign in with your XRPL wallet to get started
        </p>

        <form onSubmit={handleConnect} className="space-y-6">
          <div>
            <label htmlFor="wallet" className="block text-sm font-medium text-gray-700 mb-2">
              XRPL Wallet Address
            </label>
            <input
              id="wallet"
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-2">Don't have an XRPL wallet?</p>
          <a
            href="https://xumm.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Get Xaman Wallet →
          </a>
        </div>
      </div>
    </main>
  );
}
