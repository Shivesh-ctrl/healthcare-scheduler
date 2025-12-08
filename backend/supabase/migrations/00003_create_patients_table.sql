-- Create patients table to store user details
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX idx_patients_user_id ON public.patients(user_id);
CREATE INDEX idx_patients_email ON public.patients(email);

-- Enable updated_at trigger
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create patient record when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.patients (user_id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, patients.name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run when a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Patients can view their own record
CREATE POLICY "Patients can view own record"
    ON public.patients FOR SELECT
    USING (auth.uid() = user_id);

-- Patients can update their own record
CREATE POLICY "Patients can update own record"
    ON public.patients FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can view all patients"
    ON public.patients FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert patients"
    ON public.patients FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update patients"
    ON public.patients FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete patients"
    ON public.patients FOR DELETE
    USING (auth.role() = 'service_role');

