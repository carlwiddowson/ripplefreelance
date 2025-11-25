# RippleFreelance - Quick Start Guide

Get your XRPL-powered freelance marketplace running in under 15 minutes.

## 🚀 Prerequisites

Before you begin, ensure you have:
- **Node.js v20+** installed ([Download](https://nodejs.org/))
- **PostgreSQL 14+** running locally
- **Redis** installed (for caching)
- **XRPL Testnet account** with funded XRP

## 📦 Step 1: Clone & Install

```bash
cd /Users/carl/Documents/ripplefreelance

# Install backend dependencies
cd backend
npm install

# Create logs directory
mkdir logs
```

## 🔑 Step 2: Get XRPL Testnet Credentials

1. Visit the [XRPL Testnet Faucet](https://xrpl.org/xrp-testnet-faucet.html)
2. Generate a new wallet or use existing
3. Save your:
   - **Wallet address** (starts with `r`)
   - **Secret seed** (starts with `s`)
   - You'll receive 10,000 Test XRP

**Example output:**
```json
{
  "account": {
    "address": "rN7n7otQDd6FczFgLdlqtyMVrn3HMtthP",
    "secret": "sn3nxiW7v8KXzPzAqzyHXbSSKNuN9"
  },
  "balance": 10000
}
```

## ⚙️ Step 3: Configure Environment

```bash
# Copy example env file
cd backend
cp .env.example .env

# Edit .env with your credentials
```

**Update these values in `.env`:**

```bash
# XRPL Configuration
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
XRPL_WALLET_SEED=sn3nxiW7v8KXzPzAqzyHXbSSKNuN9  # Your testnet seed

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ripplefreelance

# JWT
JWT_SECRET=change-this-to-random-secret-in-production

# Encryption
ENCRYPTION_KEY=32-character-key-for-encrypting-escrow-fulfillments
```

## 🗄️ Step 4: Setup Database

```bash
# Create PostgreSQL database
createdb ripplefreelance

# Run migrations (to be implemented)
npm run migrate
```

## 🏃 Step 5: Start Development Server

```bash
cd backend
npm run dev
```

You should see:
```
2025-11-21 02:30:00 [info]: Initializing XRPL client...
2025-11-21 02:30:01 [info]: Connected to XRPL network: wss://s.altnet.rippletest.net:51233
2025-11-21 02:30:01 [info]: Wallet initialized: rN7n7otQDd6FczFgLdlqtyMVrn3HMtthP
2025-11-21 02:30:01 [info]: 🚀 RippleFreelance backend running on port 3000
```

## ✅ Step 6: Test the API

Open a new terminal and test endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Response:
# {"status":"ok","timestamp":"2025-11-21T02:30:15.123Z"}

# API info
curl http://localhost:3000/api/v1

# Response:
# {
#   "name": "RippleFreelance API",
#   "version": "0.1.0",
#   "description": "Cross-border gig economy platform powered by XRPL"
# }
```

## 🧪 Step 7: Test XRPL Integration

Create a test script to verify XRPL connectivity:

```bash
# Create test file
cat > backend/src/test-xrpl.ts << 'EOF'
import { initializeXRPLClient } from './xrpl/client';
import { paymentService } from './xrpl/payment';
import { escrowService } from './xrpl/escrow';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  // Initialize client
  const client = initializeXRPLClient(
    process.env.XRPL_NETWORK!,
    process.env.XRPL_WALLET_SEED!
  );
  await client.connect();

  // Get balance
  const balance = await client.getBalance(client.getWallet().address);
  console.log(`✅ Wallet balance: ${balance} XRP`);

  // Test payment creation
  const payment = await paymentService.createXRPPayment({
    fromAddress: client.getWallet().address,
    toAddress: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY', // Genesis account
    amount: 1,
    memo: 'Test payment',
  });
  console.log('✅ Payment created:', payment.TransactionType);

  // Test escrow generation
  const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const { escrow, fulfillment } = await escrowService.createMilestoneEscrow(
    client.getWallet().address,
    'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY',
    10,
    deliveryDate
  );
  console.log('✅ Escrow created with condition:', escrow.Condition);
  console.log('✅ Fulfillment generated (secret)');

  await client.disconnect();
  console.log('\n🎉 All tests passed!');
}

test().catch(console.error);
EOF

# Run test
npx tsx backend/src/test-xrpl.ts
```

Expected output:
```
✅ Wallet balance: 10000 XRP
✅ Payment created: Payment
✅ Escrow created with condition: A123...
✅ Fulfillment generated (secret)

🎉 All tests passed!
```

## 📱 Next Steps

### Week 1-2: Core Backend
- [ ] Implement database models (users, gigs, transactions, escrows)
- [ ] Add authentication routes (Xaman wallet integration)
- [ ] Create gig CRUD endpoints
- [ ] Build payment endpoints

### Week 3-4: XRPL Integration
- [ ] Implement real payment submission flow
- [ ] Add escrow creation/release endpoints
- [ ] Build transaction monitoring service
- [ ] Add WebSocket support for real-time updates

### Week 5-6: Testing & Polish
- [ ] Write integration tests
- [ ] Add rate limiting & security
- [ ] Deploy to staging (Railway/Heroku)
- [ ] Performance optimization

## 🛠 Development Tools

### XRPL Explorer (Testnet)
Monitor your transactions:
- [https://testnet.xrpl.org/](https://testnet.xrpl.org/)
- Search your wallet address to see all transactions

### XRPL API Reference
- [XRPL Docs](https://xrpl.org/docs)
- [xrpl.js Reference](https://js.xrpl.org/)

### Useful Commands

```bash
# Watch backend for changes
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## 🐛 Troubleshooting

### Issue: "XRPL connection failed"
- Check if XRPL Testnet is online: https://xrpl.org/xrp-testnet-faucet.html
- Verify `XRPL_NETWORK` URL in `.env`

### Issue: "Wallet not initialized"
- Ensure `XRPL_WALLET_SEED` is set in `.env`
- Verify seed starts with `s` and is valid

### Issue: "Database connection failed"
- Check PostgreSQL is running: `pg_isready`
- Verify `DATABASE_URL` in `.env`
- Create database: `createdb ripplefreelance`

### Issue: Port 3000 already in use
- Change `PORT` in `.env` to 3001 or kill existing process

## 📚 Learning Resources

### XRPL Concepts
- [Payments](https://xrpl.org/payment.html)
- [Escrows](https://xrpl.org/escrow.html)
- [Tokens & Trustlines](https://xrpl.org/tokens.html)
- [AMM Pools](https://xrpl.org/automated-market-makers.html)

### XRPL Community
- [Discord](https://xrpldevs.org) - #javascript channel
- [Forum](https://forum.xrpl.org/)
- [GitHub Discussions](https://github.com/XRPLF/xrpl.js/discussions)

## 🎯 Success Checklist

- [x] Backend server running on port 3000
- [x] Connected to XRPL Testnet
- [x] Wallet initialized with Test XRP
- [ ] Database schema created
- [ ] API endpoints responding
- [ ] Payment flow tested
- [ ] Escrow creation/release tested

## 🚨 Important Notes

⚠️ **Security Reminders:**
- NEVER commit `.env` file to Git
- NEVER share your wallet seed publicly
- Test ONLY on Testnet, not Mainnet
- Encrypt escrow fulfillments in database

⚠️ **Development:**
- This is a MVP - optimize later
- Focus on core features first
- Test on Testnet extensively
- Document as you build

## 🆘 Need Help?

- **XRPL Issues**: Ask in [XRPL Discord](https://xrpldevs.org)
- **General Questions**: Check the plan document
- **Bugs**: Create GitHub issue (when repo is public)

---

**Ready to build?** Start with implementing the database schema and authentication flow. The XRPL integration is already set up! 🎉
