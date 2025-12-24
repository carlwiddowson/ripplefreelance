// Note: In production, use environment variables for API keys
// For now, transactions will be prepared but signed via user's Xaman app
// Xumm SDK import is optional - we primarily use deep links

type XummClient = any; // Type placeholder for optional SDK

let xummClient: XummClient | null = null;

/**
 * Initialize Xaman SDK
 * Note: This is optional - we can also use deep links without the SDK
 */
export function getXamanClient(): XummClient | null {
  // For now, we'll use deep links without the SDK
  // Uncomment below to use SDK when XAMAN_API_KEY is configured
  /*
  const XAMAN_API_KEY = process.env.NEXT_PUBLIC_XAMAN_API_KEY || '';
  if (!XAMAN_API_KEY) {
    console.warn('Xaman API key not configured. Using deep links only.');
    return null;
  }

  if (!xummClient) {
    const { Xumm } = require('xumm-sdk');
    xummClient = new Xumm(XAMAN_API_KEY);
  }
  */
  
  return xummClient;
}

/**
 * Create a payment request payload for Xaman
 */
export async function createPaymentPayload(transaction: any): Promise<{
  uuid?: string;
  qr?: string;
  deepLink: string;
  websocket?: string;
}> {
  const client = getXamanClient();

  if (client) {
    // Use SDK to create payload
    try {
      const payload = await client.payload.create({
        txjson: transaction,
        options: {
          submit: true,
          return_url: {
            web: `${window.location.origin}/gigs`,
          },
        },
      });

      return {
        uuid: payload.uuid,
        qr: payload.refs.qr_png,
        deepLink: payload.next.always,
        websocket: payload.refs.websocket_status,
      };
    } catch (error) {
      console.error('Failed to create Xaman payload:', error);
      // Fall back to deep link
    }
  }

  // Fallback: Use deep link without SDK
  const txJson = JSON.stringify(transaction);
  const deepLink = `https://xumm.app/sign?json=${encodeURIComponent(txJson)}`;

  return {
    deepLink,
  };
}

/**
 * Generate QR code URL for a transaction
 * This creates a QR code that can be scanned by Xaman mobile app
 */
export function generateQRCode(transaction: any): string {
  const txJson = JSON.stringify(transaction);
  const deepLink = `https://xumm.app/sign?json=${encodeURIComponent(txJson)}`;
  
  // Use a QR code generation service or library
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`;
}

/**
 * Open Xaman app with transaction for signing
 */
export function openXamanApp(transaction: any): void {
  const txJson = JSON.stringify(transaction);
  const deepLink = `https://xumm.app/sign?json=${encodeURIComponent(txJson)}`;
  
  // Try to open the app
  window.open(deepLink, '_blank');
}

/**
 * Check if user has Xaman wallet installed (mobile detection)
 */
export function isXamanInstalled(): boolean {
  // This is a simple check - in production, you might want more sophisticated detection
  const userAgent = navigator.userAgent || navigator.vendor;
  
  // Check if running in Xaman browser
  if (userAgent.includes('Xumm') || userAgent.includes('XUMM')) {
    return true;
  }

  // For desktop, we can't reliably detect if the app is installed
  // So we assume it might be and show the QR code
  return false;
}

/**
 * Format transaction for display
 */
export function formatTransaction(tx: any): {
  type: string;
  from: string;
  to: string;
  amount: string;
  fee?: string;
} {
  const type = tx.TransactionType || 'Unknown';
  const from = tx.Account || '';
  const to = tx.Destination || '';
  
  let amount = '0';
  if (typeof tx.Amount === 'string') {
    // XRP in drops
    amount = `${(parseInt(tx.Amount) / 1_000_000).toFixed(6)} XRP`;
  } else if (typeof tx.Amount === 'object') {
    // Issued currency (e.g., RLUSD)
    amount = `${tx.Amount.value} ${tx.Amount.currency}`;
  }

  return {
    type,
    from,
    to,
    amount,
    fee: tx.Fee ? `${(parseInt(tx.Fee) / 1_000_000).toFixed(6)} XRP` : undefined,
  };
}

/**
 * Subscribe to payload status updates
 * Returns a cleanup function
 */
export function subscribeToPayload(
  uuid: string,
  onUpdate: (status: 'pending' | 'signed' | 'rejected' | 'expired') => void
): () => void {
  const client = getXamanClient();

  if (!client) {
    console.warn('Cannot subscribe without Xaman SDK');
    return () => {};
  }

  let cancelled = false;

  const checkStatus = async () => {
    try {
      const payload = await client.payload.get(uuid);
      
      if (cancelled) return;

      if (payload.meta.signed === true) {
        onUpdate('signed');
      } else if (payload.meta.signed === false) {
        onUpdate('rejected');
      } else if (payload.meta.expired === true) {
        onUpdate('expired');
      } else {
        // Still pending, check again
        setTimeout(checkStatus, 2000);
      }
    } catch (error) {
      console.error('Failed to check payload status:', error);
    }
  };

  checkStatus();

  return () => {
    cancelled = true;
  };
}
