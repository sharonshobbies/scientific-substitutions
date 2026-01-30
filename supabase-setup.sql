-- Supabase Setup for Scientific Substitutions
-- Run this in your Supabase SQL Editor (supabase.com > Your Project > SQL Editor)

-- Table for tracking ingredient searches
CREATE TABLE ingredient_searches (
    ingredient_key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
);

-- Table for tracking votes on substitutions
CREATE TABLE substitution_votes (
    vote_id TEXT PRIMARY KEY,
    up_count INTEGER DEFAULT 0,
    down_count INTEGER DEFAULT 0
);

-- Function to increment search count
CREATE OR REPLACE FUNCTION increment_search(ingredient TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO ingredient_searches (ingredient_key, count)
    VALUES (ingredient, 1)
    ON CONFLICT (ingredient_key)
    DO UPDATE SET count = ingredient_searches.count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update vote counts
CREATE OR REPLACE FUNCTION update_vote(
    vote_id_param TEXT,
    vote_type TEXT,
    action TEXT,
    previous_vote TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Ensure row exists
    INSERT INTO substitution_votes (vote_id, up_count, down_count)
    VALUES (vote_id_param, 0, 0)
    ON CONFLICT (vote_id) DO NOTHING;

    -- Handle the vote action
    IF action = 'remove' THEN
        -- User is removing their vote
        IF vote_type = 'up' THEN
            UPDATE substitution_votes SET up_count = GREATEST(0, up_count - 1) WHERE vote_id = vote_id_param;
        ELSE
            UPDATE substitution_votes SET down_count = GREATEST(0, down_count - 1) WHERE vote_id = vote_id_param;
        END IF;
    ELSIF action = 'switch' THEN
        -- User is switching their vote
        IF vote_type = 'up' THEN
            UPDATE substitution_votes SET up_count = up_count + 1, down_count = GREATEST(0, down_count - 1) WHERE vote_id = vote_id_param;
        ELSE
            UPDATE substitution_votes SET down_count = down_count + 1, up_count = GREATEST(0, up_count - 1) WHERE vote_id = vote_id_param;
        END IF;
    ELSE
        -- User is adding a new vote
        IF vote_type = 'up' THEN
            UPDATE substitution_votes SET up_count = up_count + 1 WHERE vote_id = vote_id_param;
        ELSE
            UPDATE substitution_votes SET down_count = down_count + 1 WHERE vote_id = vote_id_param;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE ingredient_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitution_votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Allow public read access on searches" ON ingredient_searches FOR SELECT USING (true);
CREATE POLICY "Allow public read access on votes" ON substitution_votes FOR SELECT USING (true);

-- Allow anyone to insert/update (for the RPC functions)
CREATE POLICY "Allow public insert on searches" ON ingredient_searches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on searches" ON ingredient_searches FOR UPDATE USING (true);
CREATE POLICY "Allow public insert on votes" ON substitution_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on votes" ON substitution_votes FOR UPDATE USING (true);

-- Table for substitution requests from users
CREATE TABLE substitution_requests (
    id SERIAL PRIMARY KEY,
    ingredient TEXT NOT NULL,
    context TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed BOOLEAN DEFAULT FALSE
);

-- Enable RLS for requests table
ALTER TABLE substitution_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert requests (but not read - only you can see them in dashboard)
CREATE POLICY "Allow public insert on requests" ON substitution_requests FOR INSERT WITH CHECK (true);
