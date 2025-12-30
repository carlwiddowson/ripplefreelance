-- Migration: Add Reputation System (RepToken, Staking, Badges)
-- Phase 3: Reputation System

-- RepToken Balances Table
CREATE TABLE IF NOT EXISTS reptoken_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    available_balance DECIMAL(20, 6) NOT NULL DEFAULT 0,
    staked_balance DECIMAL(20, 6) NOT NULL DEFAULT 0,
    total_earned DECIMAL(20, 6) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_reptoken_balances_user_id ON reptoken_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_reptoken_balances_available ON reptoken_balances(available_balance);

-- Staking Positions Table
CREATE TABLE IF NOT EXISTS staking_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 6) NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('BRONZE', 'SILVER', 'GOLD')),
    staked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unlock_at TIMESTAMP WITH TIME ZONE NOT NULL,
    unstaked_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unstaked', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staking_positions_user_id ON staking_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_positions_status ON staking_positions(status);
CREATE INDEX IF NOT EXISTS idx_staking_positions_unlock_at ON staking_positions(unlock_at);

-- Reputation Events Table (audit log)
CREATE TABLE IF NOT EXISTS reputation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 6),
    gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
    review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reputation_events_user_id ON reputation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_events_type ON reputation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_reputation_events_created_at ON reputation_events(created_at);
CREATE INDEX IF NOT EXISTS idx_reputation_events_gig_id ON reputation_events(gig_id);

-- Badge Ownership Table
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('BRONZE', 'SILVER', 'GOLD')),
    staking_position_id UUID REFERENCES staking_positions(id) ON DELETE SET NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, tier, active)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_tier ON user_badges(tier);
CREATE INDEX IF NOT EXISTS idx_user_badges_active ON user_badges(active);

-- Reputation Scores View (calculated on-the-fly)
CREATE OR REPLACE VIEW reputation_scores AS
SELECT 
    u.id as user_id,
    u.wallet_address,
    COALESCE(rb.available_balance, 0) as available_rep,
    COALESCE(rb.staked_balance, 0) as staked_rep,
    COALESCE(rb.total_earned, 0) as total_rep_earned,
    COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'completed') as gigs_completed,
    COALESCE(AVG(r.rating) FILTER (WHERE r.reviewee_id = u.id), 0) as average_rating,
    COUNT(DISTINCT r.id) FILTER (WHERE r.reviewee_id = u.id) as reviews_received,
    COUNT(DISTINCT ub.id) FILTER (WHERE ub.active = TRUE) as active_badges,
    MAX(ub.tier) FILTER (WHERE ub.active = TRUE) as highest_badge,
    -- Composite reputation score calculation
    (
        (COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'completed') * 1.0) +
        ((COALESCE(AVG(r.rating) FILTER (WHERE r.reviewee_id = u.id), 0) / 5.0) * 100 * 2.0) +
        ((COALESCE(rb.available_balance, 0) / 1000) * 0.5)
    ) * CASE 
        WHEN EXISTS (SELECT 1 FROM user_badges WHERE user_id = u.id AND active = TRUE) THEN 1.5
        ELSE 1.0
    END as reputation_score
FROM users u
LEFT JOIN reptoken_balances rb ON u.id = rb.user_id
LEFT JOIN gigs g ON u.id = g.freelancer_id
LEFT JOIN reviews r ON u.id = r.reviewee_id
LEFT JOIN user_badges ub ON u.id = ub.user_id
GROUP BY u.id, u.wallet_address, rb.available_balance, rb.staked_balance, rb.total_earned;

-- Leaderboard View (top users by reputation)
CREATE OR REPLACE VIEW reputation_leaderboard AS
SELECT 
    user_id,
    wallet_address,
    gigs_completed,
    average_rating,
    total_rep_earned,
    highest_badge,
    reputation_score,
    RANK() OVER (ORDER BY reputation_score DESC) as rank
FROM reputation_scores
WHERE reputation_score > 0
ORDER BY reputation_score DESC;

-- Function to initialize RepToken balance for new users
CREATE OR REPLACE FUNCTION initialize_reptoken_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO reptoken_balances (user_id, available_balance, staked_balance, total_earned)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create RepToken balance on user creation
CREATE TRIGGER trigger_initialize_reptoken_balance
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION initialize_reptoken_balance();

-- Function to update RepToken balance on events
CREATE OR REPLACE FUNCTION update_reptoken_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type IN ('gig_completion', 'review_received', 'review_given', 'milestone_completion') THEN
        UPDATE reptoken_balances
        SET 
            available_balance = available_balance + NEW.amount,
            total_earned = total_earned + NEW.amount,
            last_updated = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update balance on reputation events
CREATE TRIGGER trigger_update_reptoken_balance
AFTER INSERT ON reputation_events
FOR EACH ROW
EXECUTE FUNCTION update_reptoken_balance();

-- Function to update staking position status
CREATE OR REPLACE FUNCTION check_staking_unlock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unlock_at <= CURRENT_TIMESTAMP AND NEW.status = 'active' THEN
        NEW.status = 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check unlock status
CREATE TRIGGER trigger_check_staking_unlock
BEFORE UPDATE ON staking_positions
FOR EACH ROW
EXECUTE FUNCTION check_staking_unlock();

-- Comments
COMMENT ON TABLE reptoken_balances IS 'Tracks RepToken balances for users';
COMMENT ON TABLE staking_positions IS 'Records RepToken staking positions for badge eligibility';
COMMENT ON TABLE reputation_events IS 'Audit log of all reputation-related events and token issuance';
COMMENT ON TABLE user_badges IS 'Tracks earned verification badges from staking';
COMMENT ON VIEW reputation_scores IS 'Calculated reputation scores for all users';
COMMENT ON VIEW reputation_leaderboard IS 'Top users ranked by reputation score';
