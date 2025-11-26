import Link from 'next/link';
import { Zap, Lock, DollarSign, Clock, TrendingUp, Users } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Cross-Border Freelancing.
            <br />
            <span className="text-blue-200">Powered by XRP Ledger.</span>
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Instant settlements. Lightning-fast payments. Zero borders.
            Connect with global talent and get paid in seconds with XRP and RLUSD.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100"
            >
              Get Started
            </Link>
            <Link
              href="/gigs"
              className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600"
            >
              Browse Gigs
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why RippleFreelance?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <Zap size={48} />
              </div>
              <h3 className="text-xl font-bold mb-2">Instant Payments</h3>
              <p className="text-gray-600">
                Get paid in 3-5 seconds with XRP. No more waiting weeks for international transfers.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <Lock size={48} />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Escrow</h3>
              <p className="text-gray-600">
                Non-custodial milestone-based payments using XRPL native escrow for complete security.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <DollarSign size={48} />
              </div>
              <h3 className="text-xl font-bold mb-2">Ultra-Low Fees</h3>
              <p className="text-gray-600">
                Only 1% platform fee with {'<'}$0.01 transaction costs. Keep more of what you earn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">3-5s</div>
              <div className="text-gray-600">Settlement Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">{'<'}$0.01</div>
              <div className="text-gray-600">Transaction Fee</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">1%</div>
              <div className="text-gray-600">Platform Fee</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Global Access</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to revolutionize freelancing?</h2>
          <p className="text-xl mb-8">Join the XRPL-powered gig economy today.</p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100"
          >
            Connect Your Wallet
          </Link>
        </div>
      </section>
    </main>
  );
}
