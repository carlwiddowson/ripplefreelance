-- Migration: Add dual currency support (XRP and RLUSD) to gigs table
-- Phase 2: RLUSD + AMM Integration

-- Add currency field to gigs table
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'XRP' CHECK (currency IN ('XRP', 'RLUSD', 'BOTH'));

-- Add price fields for both currencies
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS price_xrp DECIMAL(20, 6);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS price_rlusd DECIMAL(20, 6);

-- Migrate existing price_usd data to price_xrp (assuming 1:1 conversion for now)
-- In production, you would use actual conversion rates
UPDATE gigs SET price_xrp = price_usd WHERE price_xrp IS NULL;

-- Add index on currency field
CREATE INDEX IF NOT EXISTS idx_gigs_currency ON gigs(currency);

-- Update escrows table to support RLUSD
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS amount_rlusd DECIMAL(20, 6);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'XRP' CHECK (currency IN ('XRP', 'RLUSD'));

-- Make amount_xrp nullable since we now have amount_rlusd as alternative
ALTER TABLE escrows ALTER COLUMN amount_xrp DROP NOT NULL;

-- Add constraint: either amount_xrp or amount_rlusd must be set
ALTER TABLE escrows ADD CONSTRAINT check_escrow_amount 
    CHECK (
        (amount_xrp IS NOT NULL AND currency = 'XRP') OR 
        (amount_rlusd IS NOT NULL AND currency = 'RLUSD')
    );

-- Update transactions table - amount_xrp and amount_rlusd already exist
-- Just add currency field
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'XRP' CHECK (currency IN ('XRP', 'RLUSD'));

-- Add index on currency field for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);

-- Update comments
COMMENT ON COLUMN gigs.currency IS 'Currency for gig pricing: XRP, RLUSD, or BOTH (dual pricing)';
COMMENT ON COLUMN gigs.price_xrp IS 'Gig price in XRP (if applicable)';
COMMENT ON COLUMN gigs.price_rlusd IS 'Gig price in RLUSD (if applicable)';
COMMENT ON COLUMN escrows.currency IS 'Currency used for escrow: XRP or RLUSD';
COMMENT ON COLUMN escrows.amount_rlusd IS 'Escrow amount in RLUSD (if applicable)';
COMMENT ON COLUMN transactions.currency IS 'Currency used in transaction: XRP or RLUSD';
