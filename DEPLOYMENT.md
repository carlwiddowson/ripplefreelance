# Deployment Setup

This project is configured to deploy to Vercel with Neon PostgreSQL database.

## Current Setup

- **Vercel Project ID**: `prj_9G26oWDEb1lndaRHJbhQUJl2iRyk`
- **Database**: Neon PostgreSQL (configured)
- **Local Environment**: Updated with Neon credentials

## Steps to Complete Deployment

### 1. Set Environment Variables on Vercel

Run the setup script to configure all database environment variables:

```bash
./setup-vercel-env.sh
```

This will set all the Neon database credentials for production, preview, and development environments.

### 2. Set Additional Required Variables

You'll need to manually set these environment variables through the Vercel dashboard or CLI:

```bash
# XRPL Configuration
vercel env add XRPL_NETWORK production preview development
# Enter: wss://s.altnet.rippletest.net:51233

vercel env add XRPL_WALLET_SEED production preview development
# Enter your wallet seed

# JWT Configuration
vercel env add JWT_SECRET production preview development
# Enter a strong secret key

vercel env add JWT_EXPIRES_IN production preview development
# Enter: 7d

# Encryption
vercel env add ENCRYPTION_KEY production preview development
# Enter a 32-character encryption key

# RLUSD Issuer
vercel env add RLUSD_ISSUER_ADDRESS production preview development
# Enter the issuer address

# Supabase (if using)
vercel env add SUPABASE_URL production preview development
# Enter your Supabase URL

vercel env add SUPABASE_ANON_KEY production preview development
# Enter your Supabase anon key

# Server Configuration
vercel env add PORT production preview development
# Enter: 3000

vercel env add NODE_ENV production
# Enter: production

# Rate Limiting
vercel env add RATE_LIMIT_WINDOW_MS production preview development
# Enter: 900000

vercel env add RATE_LIMIT_MAX_REQUESTS production preview development
# Enter: 100

# Logging
vercel env add LOG_LEVEL production preview development
# Enter: info
```

### 3. Deploy to Vercel

Deploy your application:

```bash
vercel --prod
```

Or push to your git repository if you have automatic deployments configured.

### 4. Verify Database Connection

After deployment, check that your application can connect to the Neon database:

```bash
vercel logs
```

## Database URLs

- **Pooled (Recommended)**: Already configured via `DATABASE_URL`
- **Direct Connection**: Available via `DATABASE_URL_UNPOOLED`

## Environment Variables Set

The following Neon database variables are configured:

- `DATABASE_URL` - Main pooled connection string
- `DATABASE_URL_UNPOOLED` - Direct connection (no pgbouncer)
- `PGHOST` - Pooled host
- `PGHOST_UNPOOLED` - Direct host
- `PGUSER` - Database user
- `PGDATABASE` - Database name
- `PGPASSWORD` - Database password
- `POSTGRES_URL` - Alias for DATABASE_URL
- `POSTGRES_URL_NON_POOLING` - Non-pooled connection
- `POSTGRES_USER` - Alias for PGUSER
- `POSTGRES_HOST` - Alias for PGHOST
- `POSTGRES_PASSWORD` - Alias for PGPASSWORD
- `POSTGRES_DATABASE` - Alias for PGDATABASE
- `POSTGRES_URL_NO_SSL` - Connection without SSL
- `POSTGRES_PRISMA_URL` - Connection string with Prisma-specific parameters

## Local Development

Your local `.env` file in the `backend` directory has been updated with the Neon database credentials. You can now run your application locally:

```bash
cd backend
npm run dev
```

## Troubleshooting

### Connection Issues

If you experience connection issues:

1. Check that SSL mode is enabled (`?sslmode=require`)
2. Use the unpooled connection for migrations: `DATABASE_URL_UNPOOLED`
3. Verify your IP is allowed in Neon dashboard (Neon typically allows all IPs by default)

### Viewing Environment Variables

List all configured environment variables:

```bash
vercel env ls
```

### Removing Environment Variables

If you need to remove a variable:

```bash
vercel env rm VARIABLE_NAME production
```
