# RippleFreelance

A cross-border gig economy platform powered by XRP Ledger (XRPL) DeFi.

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
- React Native (Expo)
- Next.js (Web version)
- TanStack Query
- NativeBase/Tamagui UI

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
├── mobile/          # React Native app
│   ├── src/
│   │   ├── screens/ # App screens
│   │   ├── components/
│   │   └── hooks/   # Custom hooks (XRPL, auth)
│   └── package.json
├── web/             # Next.js web app (future)
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

### Mobile Setup

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
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

### Mobile (.env)
```
API_BASE_URL=http://localhost:3000
XAMAN_API_KEY=your_xaman_api_key
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

### Authentication
- `POST /auth/connect-wallet` - Connect Xaman wallet
- `GET /auth/me` - Get current user

### Gigs
- `GET /gigs` - List all gigs
- `POST /gigs` - Create new gig (freelancers)
- `GET /gigs/:id` - Get gig details

### Payments
- `POST /payments/create` - Initiate XRP/RLUSD payment
- `POST /escrows/create` - Create milestone escrow
- `POST /escrows/:id/release` - Release escrow after approval

See [API.md](./docs/API.md) for full documentation.

## 🏆 Roadmap

### Phase 1: MVP (Weeks 1-6)
- [x] Project setup
- [x] **Week 1 Complete!** Database, Auth, User Management
  - [x] PostgreSQL schema with 6 tables
  - [x] JWT authentication with sessions
  - [x] Wallet signature verification
  - [x] User CRUD with role-based access
  - [x] 9 API endpoints functional
- [ ] Week 2: Gig marketplace CRUD
- [ ] Week 3-4: XRP payments & escrow integration
- [ ] Week 5-6: Testing & Mobile app UI

### Phase 2: RLUSD + AMM (Weeks 7-8)
- [ ] RLUSD trustline integration
- [ ] XRP/RLUSD conversion via AMM
- [ ] Dual currency pricing

### Phase 3: Reputation System (Weeks 9-10)
- [ ] RepToken issuance
- [ ] Staking for verified badges

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
