-- Neon Database Setup for Wallet App
-- This SQL script creates the necessary table structure for the wallet application

-- Create the wallet-app table
CREATE TABLE IF NOT EXISTS "wallet-app" (
    id BIGINT PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE,
    type VARCHAR(20) CHECK (type IN ('asset', 'income', 'expense')),
    "desc" TEXT,
    category VARCHAR(100),
    amount DECIMAL(10,2),
    user VARCHAR(50) DEFAULT 'renu'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_app_user ON "wallet-app"(user);
CREATE INDEX IF NOT EXISTS idx_wallet_app_date ON "wallet-app"(date);
CREATE INDEX IF NOT EXISTS idx_wallet_app_type ON "wallet-app"(type);
CREATE INDEX IF NOT EXISTS idx_wallet_app_category ON "wallet-app"(category);

-- Insert sample data (optional)
-- INSERT INTO "wallet-app" (id, date, type, desc, category, amount, user) VALUES
-- (1, '2024-01-01', 'income', 'Salary', 'Income', 5000.00, 'safar'),
-- (2, '2024-01-02', 'expense', 'Groceries', 'Food', 150.00, 'safar'),
-- (3, '2024-01-03', 'asset', 'Savings Account', 'Bank', 2000.00, 'safar');

-- Grant necessary permissions (adjust as needed for your Neon setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON "wallet-app" TO your_database_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_database_user;

-- Enable Row Level Security (optional, for multi-user setups)
-- ALTER TABLE "wallet-app" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own transactions (if using RLS)
-- CREATE POLICY "Users can view their own transactions" ON "wallet-app"
--     FOR ALL USING (user = current_user);