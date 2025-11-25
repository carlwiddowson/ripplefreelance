import { Client, Wallet } from 'xrpl';
import { logger } from '../utils/logger';

class XRPLClient {
  private client: Client | null = null;
  private wallet: Wallet | null = null;
  private isConnected = false;

  constructor(private networkUrl: string, private walletSeed?: string) {}

  /**
   * Connect to XRPL network
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.warn('XRPL client already connected');
        return;
      }

      this.client = new Client(this.networkUrl);
      await this.client.connect();
      this.isConnected = true;

      logger.info(`Connected to XRPL network: ${this.networkUrl}`);

      // Initialize wallet if seed provided
      if (this.walletSeed) {
        this.wallet = Wallet.fromSeed(this.walletSeed);
        logger.info(`Wallet initialized: ${this.wallet.address}`);
      }
    } catch (error) {
      logger.error('Failed to connect to XRPL:', error);
      throw new Error(`XRPL connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from XRPL network
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from XRPL network');
    }
  }

  /**
   * Get XRPL client instance
   */
  getClient(): Client {
    if (!this.client || !this.isConnected) {
      throw new Error('XRPL client not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Get platform wallet (for oracle operations)
   */
  getWallet(): Wallet {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    return this.wallet;
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get account info from XRPL
   */
  async getAccountInfo(address: string) {
    const client = this.getClient();
    try {
      const response = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
      });
      return response.result.account_data;
    } catch (error) {
      logger.error(`Failed to get account info for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get account balance in XRP
   */
  async getBalance(address: string): Promise<number> {
    const accountInfo = await this.getAccountInfo(address);
    return Number(accountInfo.Balance) / 1_000_000; // Convert drops to XRP
  }

  /**
   * Subscribe to transaction stream for an account
   */
  async subscribeToAccount(address: string, callback: (tx: any) => void) {
    const client = this.getClient();
    
    await client.request({
      command: 'subscribe',
      accounts: [address],
    });

    client.on('transaction', (tx) => {
      if (tx.transaction.Account === address || tx.transaction.Destination === address) {
        callback(tx);
      }
    });

    logger.info(`Subscribed to transactions for account: ${address}`);
  }
}

// Singleton instance
let xrplClient: XRPLClient;

export function initializeXRPLClient(networkUrl: string, walletSeed?: string): XRPLClient {
  if (!xrplClient) {
    xrplClient = new XRPLClient(networkUrl, walletSeed);
  }
  return xrplClient;
}

export function getXRPLClient(): XRPLClient {
  if (!xrplClient) {
    throw new Error('XRPL client not initialized. Call initializeXRPLClient() first.');
  }
  return xrplClient;
}

export { XRPLClient };
