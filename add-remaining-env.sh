#!/bin/bash

echo "Adding remaining environment variables to Vercel..."
echo ""

# JWT_SECRET
echo "Adding JWT_SECRET..."
echo "O6/BVs8v8eJU36pqpFH7s/BedTfN6JekkRnaYklpXEk=" | vercel env add JWT_SECRET production
echo "O6/BVs8v8eJU36pqpFH7s/BedTfN6JekkRnaYklpXEk=" | vercel env add JWT_SECRET preview
echo "O6/BVs8v8eJU36pqpFH7s/BedTfN6JekkRnaYklpXEk=" | vercel env add JWT_SECRET development

# ENCRYPTION_KEY
echo "Adding ENCRYPTION_KEY..."
echo "bd910caa21bb4a80f4ca6b827cab8847" | vercel env add ENCRYPTION_KEY production
echo "bd910caa21bb4a80f4ca6b827cab8847" | vercel env add ENCRYPTION_KEY preview
echo "bd910caa21bb4a80f4ca6b827cab8847" | vercel env add ENCRYPTION_KEY development

# XRPL_WALLET_SEED
echo "Adding XRPL_WALLET_SEED..."
echo "sEdT7CJBmANrburmFvA7fvSWXzGSnpM" | vercel env add XRPL_WALLET_SEED production
echo "sEdT7CJBmANrburmFvA7fvSWXzGSnpM" | vercel env add XRPL_WALLET_SEED preview
echo "sEdT7CJBmANrburmFvA7fvSWXzGSnpM" | vercel env add XRPL_WALLET_SEED development

# RLUSD_ISSUER_ADDRESS
echo "Adding RLUSD_ISSUER_ADDRESS..."
echo "rN7n7otQDd6FczFgLdlqtyMVrn3HMfxk4N" | vercel env add RLUSD_ISSUER_ADDRESS production
echo "rN7n7otQDd6FczFgLdlqtyMVrn3HMfxk4N" | vercel env add RLUSD_ISSUER_ADDRESS preview
echo "rN7n7otQDd6FczFgLdlqtyMVrn3HMfxk4N" | vercel env add RLUSD_ISSUER_ADDRESS development

# XRPL_NETWORK
echo "Adding XRPL_NETWORK..."
echo "wss://s.altnet.rippletest.net:51233" | vercel env add XRPL_NETWORK production
echo "wss://s.altnet.rippletest.net:51233" | vercel env add XRPL_NETWORK preview
echo "wss://s.altnet.rippletest.net:51233" | vercel env add XRPL_NETWORK development

# JWT_EXPIRES_IN
echo "Adding JWT_EXPIRES_IN..."
echo "7d" | vercel env add JWT_EXPIRES_IN production
echo "7d" | vercel env add JWT_EXPIRES_IN preview
echo "7d" | vercel env add JWT_EXPIRES_IN development

# Other configuration
echo "Adding PORT..."
echo "3000" | vercel env add PORT production
echo "3000" | vercel env add PORT preview
echo "3000" | vercel env add PORT development

echo "Adding RATE_LIMIT_WINDOW_MS..."
echo "900000" | vercel env add RATE_LIMIT_WINDOW_MS production
echo "900000" | vercel env add RATE_LIMIT_WINDOW_MS preview
echo "900000" | vercel env add RATE_LIMIT_WINDOW_MS development

echo "Adding RATE_LIMIT_MAX_REQUESTS..."
echo "100" | vercel env add RATE_LIMIT_MAX_REQUESTS production
echo "100" | vercel env add RATE_LIMIT_MAX_REQUESTS preview
echo "100" | vercel env add RATE_LIMIT_MAX_REQUESTS development

echo "Adding LOG_LEVEL..."
echo "info" | vercel env add LOG_LEVEL production
echo "info" | vercel env add LOG_LEVEL preview
echo "info" | vercel env add LOG_LEVEL development

echo ""
echo "✅ All environment variables added successfully!"
