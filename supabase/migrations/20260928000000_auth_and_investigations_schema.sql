-- OceanTrace AI — Supabase Database Migration
-- Auth Profiles, User-Linked Investigations, and RLS Policies

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'investigator',
  organization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create investigations table
CREATE TABLE IF NOT EXISTS public.investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_investigations_user_id ON public.investigations(user_id);
CREATE INDEX IF NOT EXISTS idx_investigations_investigation_id ON public.investigations(investigation_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

-- 5. Profiles RLS Policies (auth.uid() = id)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Investigations RLS Policies (auth.uid() = user_id)
CREATE POLICY "Users can view own investigations"
  ON public.investigations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investigations"
  ON public.investigations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investigations"
  ON public.investigations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own investigations"
  ON public.investigations FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Trigger to automatically handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'investigator', -- New accounts ALWAYS start as investigator
    COALESCE(NEW.raw_user_meta_data->>'organization', 'Maritime Surveillance')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Trigger to prevent normal users from changing their role
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent role mutation by normal authenticated users
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
      RAISE EXCEPTION 'Unauthorized: User role changes must use an administrator privileges mechanism.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_role_update ON public.profiles;
CREATE TRIGGER protect_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_role_update();
