'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { gigsApi, escrowsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { generateQRCode, openXamanApp, formatTransaction } from '@/lib/xaman';

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
}

interface Escrow {
  id: string;
  status: 'created' | 'released' | 'cancelled' | 'expired';
  amount_xrp: number;
  finish_after?: string;
  cancel_after: string;
}

export default function GigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [gig, setGig] = useState<Gig | null>(null);
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'init' | 'sign' | 'confirm' | 'success'>('init');
  const [transaction, setTransaction] = useState<any>(null);
  const [escrowIntent, setEscrowIntent] = useState<any>(null);

  const gigId = params.id as string;

  useEffect(() => {
    loadGigDetails();
  }, [gigId]);

  const loadGigDetails = async () => {
    try {
      setLoading(true);
      const [gigResponse, escrowsResponse] = await Promise.all([
        gigsApi.getGig(gigId),
        escrowsApi.listEscrows({ limit: 1 }).catch(() => ({ data: { escrows: [] } })),
      ]);
      
      setGig(gigResponse.data.gig);
      
      // Find escrow for this gig if authenticated
      if (isAuthenticated && escrowsResponse.data.escrows) {
        const gigEscrow = escrowsResponse.data.escrows.find((e: any) => e.gig_id === gigId);
        if (gigEscrow) {
          setEscrow(gigEscrow);
        }
      }
    } catch (error) {
      console.error('Failed to load gig:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithEscrow = async () => {
    if (!user || !gig) return;

    try {
      setShowPaymentModal(true);
      setPaymentStep('init');

      // Calculate delivery date (estimated days from now)
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + gig.estimated_delivery_days);

      // Convert USD to XRP (mock rate for now)
      const xrpAmount = gig.price_usd / 0.5; // Assume 1 XRP = $0.50

      // Create escrow intent
      const response = await escrowsApi.createEscrow({
        gig_id: gigId,
        amount_xrp: xrpAmount,
        delivery_date: deliveryDate.toISOString(),
      });

      const intent = response.data.escrow_intent;
      setEscrowIntent(intent);
      setTransaction(intent.transaction);
      setPaymentStep('sign');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create escrow');
      setShowPaymentModal(false);
    }
  };

  const handleSignTransaction = () => {
    if (!transaction) return;
    openXamanApp(transaction);
    setPaymentStep('confirm');
  };

  const handleConfirmEscrow = async (txHash: string, sequence: number) => {
    if (!escrowIntent) return;

    try {
      await escrowsApi.confirmEscrow({
        gig_id: gigId,
        xrpl_tx_hash: txHash,
        xrpl_sequence_number: sequence,
        condition: escrowIntent.condition,
        fulfillment: escrowIntent.fulfillment,
        cancel_after: escrowIntent.transaction.CancelAfter.toString(),
        amount_xrp: escrowIntent.amount_xrp,
      });

      setPaymentStep('success');
      setTimeout(() => {
        setShowPaymentModal(false);
        loadGigDetails();
      }, 2000);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to confirm escrow');
    }
  };

  const handleReleasePayment = async () => {
    if (!escrow) return;

    try {
      const response = await escrowsApi.releaseEscrow(escrow.id);
      const releaseTx = response.data.release_intent.transaction;
      
      // Open Xaman to sign release transaction
      openXamanApp(releaseTx);
      
      // In a real app, wait for user to sign and then confirm
      alert('Please sign the transaction in Xaman app. After signing, the payment will be released to the freelancer.');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to release payment');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading gig details...</p>
        </div>
      </main>
    );
  }

  if (!gig) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Gig not found</h1>
          <button
            onClick={() => router.push('/gigs')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Gigs
          </button>
        </div>
      </main>
    );
  }

  const isOwner = user?.id === gig.freelancer_id;
  const canPayWithEscrow = isAuthenticated && !isOwner && gig.status === 'open' && !escrow;
  const canReleasePayment = isAuthenticated && !isOwner && escrow?.status === 'created';

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <button
          onClick={() => router.push('/gigs')}
          className="mb-6 text-blue-600 hover:text-blue-800"
        >
          ← Back to Gigs
        </button>

        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold">{gig.title}</h1>
            <span className={`px-3 py-1 text-sm rounded-full ${
              gig.status === 'open' ? 'bg-green-100 text-green-800' :
              gig.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              gig.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }`}>
              {gig.status}
            </span>
          </div>

          <div className="mb-6">
            <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded mr-2">
              {gig.category}
            </span>
            {gig.skills.map((skill, idx) => (
              <span key={idx} className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded mr-2">
                {skill}
              </span>
            ))}
          </div>

          <p className="text-gray-700 mb-6 whitespace-pre-wrap">{gig.description}</p>

          <div className="border-t pt-6 flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold text-green-600">${gig.price_usd}</p>
              <p className="text-sm text-gray-500">Delivery: {gig.estimated_delivery_days} days</p>
            </div>
            
            {canPayWithEscrow && (
              <button
                onClick={handlePayWithEscrow}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Pay with Escrow
              </button>
            )}
            
            {canReleasePayment && (
              <button
                onClick={handleReleasePayment}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Release Payment
              </button>
            )}
          </div>
        </div>

        {/* Escrow Status */}
        {escrow && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Escrow Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-semibold capitalize">{escrow.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-semibold">{escrow.amount_xrp.toFixed(6)} XRP</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cancel After</p>
                <p className="font-semibold">{new Date(escrow.cancel_after).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {paymentStep === 'init' && (
              <>
                <h2 className="text-2xl font-bold mb-4">Creating Escrow...</h2>
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-gray-600">Please wait...</p>
                </div>
              </>
            )}

            {paymentStep === 'sign' && transaction && (
              <>
                <h2 className="text-2xl font-bold mb-4">Sign Transaction</h2>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Scan with Xaman app:</p>
                  <img 
                    src={generateQRCode(transaction)} 
                    alt="QR Code" 
                    className="w-full max-w-[300px] mx-auto mb-4"
                  />
                </div>
                <button
                  onClick={handleSignTransaction}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 mb-2"
                >
                  Open Xaman App
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </>
            )}

            {paymentStep === 'confirm' && (
              <>
                <h2 className="text-2xl font-bold mb-4">Confirm Transaction</h2>
                <p className="text-gray-600 mb-4">
                  After signing in Xaman, paste the transaction hash and sequence number:
                </p>
                <input
                  type="text"
                  placeholder="Transaction Hash (64 characters)"
                  className="w-full px-3 py-2 border rounded-lg mb-3"
                  id="txHash"
                />
                <input
                  type="number"
                  placeholder="Sequence Number"
                  className="w-full px-3 py-2 border rounded-lg mb-4"
                  id="txSequence"
                />
                <button
                  onClick={() => {
                    const hash = (document.getElementById('txHash') as HTMLInputElement).value;
                    const seq = parseInt((document.getElementById('txSequence') as HTMLInputElement).value);
                    if (hash && seq) {
                      handleConfirmEscrow(hash, seq);
                    }
                  }}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
                >
                  Confirm Escrow
                </button>
              </>
            )}

            {paymentStep === 'success' && (
              <>
                <h2 className="text-2xl font-bold mb-4">✅ Success!</h2>
                <p className="text-gray-600">Escrow created successfully.</p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
