-- Supabase SQL Schema for Credits System
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- ============================================
-- USER CREDITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INT DEFAULT 0,
  free_credits INT DEFAULT 2,
  free_credits_reset_at TIMESTAMPTZ DEFAULT NOW(),
  total_purchased INT DEFAULT 0,
  total_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREDIT PURCHASES (Payment requests)
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  package_id TEXT NOT NULL, -- 'starter', 'value', 'pro'
  credits INT NOT NULL,
  amount INT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof_url TEXT, -- URL to uploaded transfer proof image
  proof_filename TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by TEXT
);

-- ============================================
-- CREDIT USAGE LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credits_used INT NOT NULL,
  credit_type TEXT DEFAULT 'paid' CHECK (credit_type IN ('paid', 'free')),
  duration_minutes INT,
  filename TEXT,
  recording_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RECORDINGS TABLE (for history)
-- ============================================
CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  duration_minutes INT,
  file_size_mb FLOAT,
  credits_used INT DEFAULT 1,
  transcript TEXT,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON public.credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user ON public.credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_user ON public.recordings(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own purchases" ON public.credit_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert purchases" ON public.credit_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON public.credit_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recordings" ON public.recordings
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access credits" ON public.user_credits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access purchases" ON public.credit_purchases
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access usage" ON public.credit_usage
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access recordings" ON public.recordings
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create credits record for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, free_credits, free_credits_reset_at)
  VALUES (NEW.id, 0, 2, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Function to reset free credits weekly
CREATE OR REPLACE FUNCTION public.reset_free_credits_if_needed(p_user_id UUID)
RETURNS void AS $$
DECLARE
  last_reset TIMESTAMPTZ;
  days_since_reset INT;
BEGIN
  SELECT free_credits_reset_at INTO last_reset
  FROM public.user_credits WHERE user_id = p_user_id;
  
  days_since_reset := EXTRACT(DAY FROM NOW() - last_reset);
  
  IF days_since_reset >= 7 THEN
    UPDATE public.user_credits
    SET free_credits = 2, free_credits_reset_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
