#!/bin/bash

# Set environment variables for all environments (production, preview, development)

echo "Setting up Vercel environment variables..."

# Database variables
echo "postgresql://neondb_owner:npg_4XJgROAwoy8v@ep-still-field-a4fp0a38-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require" | vercel env add DATABASE_URL production preview development

echo "postgresql://neondb_owner:npg_4XJgROAwoy8v@ep-still-field-a4fp0a38.us-east-1.aws.neon.tech/neondb?sslmode=require" | vercel env add DATABASE_URL_UNPOOLED production preview development

echo "ep-still-field-a4fp0a38-pooler.us-east-1.aws.neon.tech" | vercel env add PGHOST production preview development

echo "ep-still-field-a4fp0a38.us-east-1.aws.neon.tech" | vercel env add PGHOST_UNPOOLED production preview development

echo "neondb_owner" | vercel env add PGUSER production preview development

echo "neondb" | vercel env add PGDATABASE production preview development

echo "npg_4XJgROAwoy8v" | vercel env add PGPASSWORD production preview development

# Postgres variables for Vercel templates
echo "postgresql://neondb_owner:npg_4XJgROAwoy8v@ep-still-field-a4fp0a38-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require" | vercel env add POSTGRES_URL production preview development

echo "postgresql://neondb_owner:npg_4XJgROAwoy8v@ep-still-field-a4fp0a38.us-east-1.aws.neon.tech/neondb?sslmode=require" | vercel env add POSTGRES_URL_NON_POOLING production preview development

echo "neondb_owner" | vercel env add POSTGRES_USER production preview development

echo "ep-still-field-a4fp0a38-pooler.us-east-1.aws.neon.tech" | vercel env add POSTGRES_HOST production preview development

echo "npg_4XJgROAwoy8v" | vercel env add POSTGRES_PASSWORD production preview development

echo "neondb" | vercel env add POSTGRES_DATABASE production preview development

echo "postgresql://neondb_owner:npg_4XJgROAwoy8v@ep-still-field-a4fp0a38-pooler.us-east-1.aws.neon.tech/neondb" | vercel env add POSTGRES_URL_NO_SSL production preview development

echo "postgresql://neondb_owner:npg_4XJgROAwoy8v@ep-still-field-a4fp0a38-pooler.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require" | vercel env add POSTGRES_PRISMA_URL production preview development

echo "✅ Database environment variables set!"
echo ""
echo "⚠️  Don't forget to also set these variables manually:"
echo "  - XRPL_WALLET_SEED"
echo "  - JWT_SECRET"
echo "  - ENCRYPTION_KEY"
echo "  - RLUSD_ISSUER_ADDRESS"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_ANON_KEY"
