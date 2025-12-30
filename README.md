# RippleFreelance

A cross-border gig economy platform powered by XRP Ledger (XRPL) DeFi.

## 🌐 Live Demo

- **Frontend**: [https://ripplefreelance.vercel.app](https://ripplefreelance.vercel.app)
- **Backend API**: [https://backend-livid-zeta-66.vercel.app](https://backend-livid-zeta-66.vercel.app)

## 🚀 Vision

RippleFreelance revolutionizes the global freelance marketplace by leveraging XRPL's lightning-fast settlements and low fees to eliminate cross-border payment friction. Built for freelancers and small businesses in emerging markets, it integrates XRP, RLUSD stablecoin, and native XRPL escrow features.

## 🎯 Key Features

- **Instant Cross-Border Payments**: 3-5 second settlements with <$0.01 fees
- **Smart Escrow System**: Non-custodial milestone-based payments using XRPL native escrow
- **RLUSD Stablecoin Support**: Eliminate crypto volatility with USD-pegged stablecoin
- **Tokenized Reputation**: Earn RepTokens based on completed work
- **Mobile-First Design**: React Native app optimized for emerging markets

## 🏗 Tech Stack

### Blockchain
- **XRPL SDK**: xrpl.js v4.2.5+
- **Wallet**: Xaman (XUMM) integration
- **Network**: XRPL Testnet → Mainnet

### Backend
- Node.js 20+ with TypeScript
- Express.js REST API
- PostgreSQL + Redis
- Supabase for file storage

### Frontend
- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- TanStack Query (React Query)
- Zustand (state management)
- Lucide React (icons)
- React Native (Expo) - Coming soon

## 📋 Project Structure

```
ripplefreelance/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── xrpl/    # XRPL integration (payments, escrow)
│   │   ├── routes/  # API endpoints
│   │   ├── models/  # Database models
│   │   └── utils/   # Helper functions
│   └── package.json
├── web/              # Next.js web app ✅ DEPLOYED
│   ├── app/         # Next.js app directory
│   ├── components/  # React components
│   ├── lib/         # API client, state management
│   └── package.json
└── docs/            # Documentation
```

## 🛠 Setup & Installation

### Prerequisites
- Node.js v20+
- PostgreSQL 14+
- Redis
- XRPL Testnet account ([Get testnet XRP](https://xrpl.org/xrp-testnet-faucet.html))

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your XRPL Testnet credentials and DB config
npm run migrate
npm run dev
```

### Web Frontend Setup

```bash
cd web
npm install
cp .env.local.example .env.local
# Edit .env.local with backend API URL
npm run dev
```

### Production Deployment

Both backend and frontend are deployed on Vercel:

```bash
# Backend
cd backend
vercel --prod

# Frontend
cd web
vercel --prod
```

## 🔑 Environment Variables

### Backend (.env)
```
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
XRPL_WALLET_SEED=your_testnet_seed
DATABASE_URL=postgresql://user:password@localhost:5432/ripplefreelance
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key_for_escrow_fulfillments
```

### Web Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://backend-livid-zeta-66.vercel.app/api/v1
NEXT_PUBLIC_XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
```

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
npm run test:integration # Integration tests on XRPL Testnet
```

### Manual Testing
1. Fund a Testnet wallet: https://xrpl.org/xrp-testnet-faucet.html
2. Connect Xaman wallet to Testnet
3. Create a gig → Make payment → Test escrow flow

## 📖 API Documentation

Base URL: `https://backend-livid-zeta-66.vercel.app/api/v1`

### Authentication
- `GET /auth/challenge` - Get challenge message for wallet signing
- `POST /auth/connect-wallet` - Authenticate with wallet signature
- `GET /auth/me` - Get current user profile
- `POST /auth/logout` - Logout and delete session
- `POST /auth/refresh` - Refresh JWT token

### Users
- `GET /users` - List users with filters
- `GET /users/:wallet_address` - Get public user profile
- `PUT /users/profile` - Update own profile (authenticated)
- `DELETE /users/account` - Delete own account (authenticated)

### Gigs
- `GET /gigs` - List all gigs with filters
- `POST /gigs` - Create new gig (freelancers only)
- `GET /gigs/:id` - Get gig details
- `PUT /gigs/:id` - Update gig (owner only)
- `DELETE /gigs/:id` - Delete gig (owner only, open status)

### Payments
- `POST /payments/initiate` - Create payment intent for a gig
- `POST /payments/confirm` - Confirm payment transaction
- `GET /payments/:id` - Get payment details
- `GET /payments` - List payments (authenticated user)

### Escrows
- `POST /escrows/create` - Create milestone escrow for gig
- `POST /escrows/confirm` - Confirm escrow creation
- `POST /escrows/:id/release` - Prepare escrow release
- `POST /escrows/:id/release/confirm` - Confirm escrow release
- `POST /escrows/:id/cancel` - Prepare escrow cancellation
- `POST /escrows/:id/cancel/confirm` - Confirm escrow cancellation
- `GET /escrows/:id` - Get escrow details
- `GET /escrows` - List escrows (authenticated user)

## 🏆 Roadmap

### Phase 1: MVP (Weeks 1-6)
- [x] Project setup
- [x] **Week 1 Complete!** Database, Auth, User Management
  - [x] PostgreSQL schema with 6 tables
  - [x] JWT authentication with sessions
  - [x] Wallet signature verification
  - [x] User CRUD with role-based access
  - [x] 9 API endpoints functional
- [x] **Web Frontend Deployed!** 🚀
  - [x] Next.js 16 app with Tailwind CSS
  - [x] Landing page with hero & features
  - [x] Wallet connection/authentication
  - [x] Dashboard with user stats
  - [x] Freelancers listing page
  - [x] Full API integration
  - [x] Production deployment on Vercel
- [x] **Week 2 Complete!** Gig marketplace CRUD
  - [x] Gig model with full CRUD operations
  - [x] 5 gig API endpoints (create, list, get, update, delete)
  - [x] Gig filtering by category, status, and price
  - [x] Gigs listing page with filters and modal
  - [x] Gig detail page with payment flow
  - [x] Role-based access control
- [x] **Week 3-4 Complete!** XRP payments & escrow integration
  - [x] Encryption utility (AES-256-GCM)
  - [x] Transaction and Escrow models with CRUD
  - [x] Payment API (4 endpoints)
  - [x] Escrow API (8 endpoints)
  - [x] Xaman wallet integration
  - [x] QR code transaction signing
  - [x] Escrow creation and release flow
  - [x] Encrypted fulfillment storage
  - [x] Automatic gig status updates
- [ ] Week 5-6: Testing & enhancements

### Phase 2: RLUSD + AMM (Weeks 7-8) ✅ COMPLETE
- [x] RLUSD trustline integration
- [x] XRP/RLUSD conversion via AMM
- [x] Dual currency pricing
- [x] Check-based escrow for RLUSD
- [x] Currency configuration and utilities
- [x] Payment service enhancement
- [x] Unit tests for RLUSD integration
- **See**: [PHASE2_COMPLETE.md](./PHASE2_COMPLETE.md) for details

### Phase 3: Reputation System (Weeks 9-10) ✅ COMPLETE
- [x] RepToken issuance and economics
- [x] Staking for verified badges (Bronze/Silver/Gold)
- [x] Reputation score calculation algorithm
- [x] Leaderboard and ranking system
- [x] Badge ownership and management
- [x] Event tracking and audit log
- [x] 11 API endpoints for reputation features
- **See**: [PHASE3_COMPLETE.md](./PHASE3_COMPLETE.md) for details

### Phase 4: Hackathon (Weeks 11-12)
- [ ] Demo video
- [ ] XRPL Mainnet deployment
- [ ] Submit to XRPL Grants/Vega House

## 💰 Monetization

- **Platform Fee**: 1% of gig value (10x lower than Upwork/Fiverr)
- **Staking Rewards**: Platform fees staked in XRPL AMM pools
- **Target**: 10K users, $1M+ GMV in Year 1

## 🤝 Contributing

This project is currently in MVP development. Contributions welcome after initial launch.

## 📄 License

MIT License - See [LICENSE](./LICENSE)

## 🔗 Resources

- [XRPL Documentation](https://xrpl.org/docs)
- [xrpl.js GitHub](https://github.com/XRPLF/xrpl.js)
- [RLUSD Documentation](https://ripple.com/solutions/stablecoin/)
- [Xaman Developer Docs](https://xumm.readme.io/)
- [XRPL Discord](https://xrpldevs.org)

## 📧 Contact

Built for XRPL ecosystem by [@RippleFreelance](https://twitter.com/ripplefreelance)

---

**Note**: This project uses XRPL Testnet for development. Never use real funds on Testnet. For production, migrate to XRPL Mainnet.
