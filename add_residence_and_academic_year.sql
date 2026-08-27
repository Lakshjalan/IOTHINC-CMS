ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS residence_type text CHECK (residence_type IN ('hosteller', 'day_scholar')),
ADD COLUMN IF NOT EXISTS academic_year text;
