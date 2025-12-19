-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS licenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_key TEXT UNIQUE NOT NULL,
    user_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked'
    notes TEXT
);

-- Row Level Security
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to check a license key if they know it
CREATE POLICY "Allow public license validation" 
ON licenses FOR SELECT 
TO anon 
USING (status = 'active');
