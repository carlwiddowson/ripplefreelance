-- RippleFreelance Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('freelancer', 'client', 'both')),
    profile_data JSONB DEFAULT '{}',
    reputation_score DECIMAL(3, 2) DEFAULT 0.00,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on wallet_address for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Gigs Table
CREATE TABLE IF NOT EXISTS gigs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    skills JSONB DEFAULT '[]',
    price_usd DECIMAL(10, 2) NOT NULL,
    estimated_delivery_days INTEGER NOT NULL,
    milestones JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gigs_freelancer_id ON gigs(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category);
CREATE INDEX IF NOT EXISTS idx_gigs_price ON gigs(price_usd);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    xrpl_tx_hash VARCHAR(64) UNIQUE NOT NULL,
    from_wallet VARCHAR(50) NOT NULL,
    to_wallet VARCHAR(50) NOT NULL,
    amount_xrp DECIMAL(20, 6),
    amount_rlusd DECIMAL(20, 6),
    tx_type VARCHAR(30) NOT NULL CHECK (tx_type IN ('payment', 'escrow_create', 'escrow_finish', 'escrow_cancel')),
    gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_transactions_xrpl_hash ON transactions(xrpl_tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_from_wallet ON transactions(from_wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet ON transactions(to_wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_gig_id ON transactions(gig_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Escrows Table
CREATE TABLE IF NOT EXISTS escrows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    xrpl_sequence_number INTEGER NOT NULL,
    gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    client_wallet VARCHAR(50) NOT NULL,
    freelancer_wallet VARCHAR(50) NOT NULL,
    amount_xrp DECIMAL(20, 6) NOT NULL,
    condition_hash VARCHAR(128) NOT NULL,
    fulfillment_hash TEXT NOT NULL, -- Encrypted
    finish_after TIMESTAMP WITH TIME ZONE,
    cancel_after TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'released', 'cancelled', 'expired')),
    release_tx_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_wallet, xrpl_sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_escrows_gig_id ON escrows(gig_id);
CREATE INDEX IF NOT EXISTS idx_escrows_client_wallet ON escrows(client_wallet);
CREATE INDEX IF NOT EXISTS idx_escrows_freelancer_wallet ON escrows(freelancer_wallet);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);

-- Reviews Table (for reputation system)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(gig_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_gig_id ON reviews(gig_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);

-- Sessions Table (for JWT token management)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gigs_updated_at BEFORE UPDATE ON gigs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON escrows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.wallet_address,
    u.reputation_score,
    COUNT(DISTINCT g.id) as total_gigs,
    COUNT(DISTINCT CASE WHEN g.status = 'completed' THEN g.id END) as completed_gigs,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(DISTINCT r.id) as total_reviews
FROM users u
LEFT JOIN gigs g ON u.id = g.freelancer_id
LEFT JOIN reviews r ON u.id = r.reviewee_id
GROUP BY u.id, u.wallet_address, u.reputation_score;

-- Comments
COMMENT ON TABLE users IS 'Stores user profiles with XRPL wallet addresses';
COMMENT ON TABLE gigs IS 'Freelance gig listings with pricing and milestones';
COMMENT ON TABLE transactions IS 'XRPL transaction records (payments, escrows)';
COMMENT ON TABLE escrows IS 'Milestone-based escrow contracts with encrypted fulfillments';
COMMENT ON TABLE reviews IS 'User reviews and ratings for reputation system';
COMMENT ON TABLE sessions IS 'JWT session management for authenticated users';
