-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Create therapists table
CREATE TABLE IF NOT EXISTS public.therapists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    bio TEXT,
    specialties TEXT[] NOT NULL DEFAULT '{}',
    accepted_insurance TEXT[] NOT NULL DEFAULT '{}',
    google_calendar_id TEXT,
    google_refresh_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inquiries table
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_identifier TEXT,
    patient_name TEXT,
    patient_email TEXT,
    patient_phone TEXT,
    problem_description TEXT NOT NULL,
    requested_schedule TEXT,
    insurance_info TEXT,
    extracted_specialty TEXT,
    matched_therapist_id UUID REFERENCES public.therapists(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'scheduled', 'failed', 'cancelled')),
    conversation_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES public.therapists(id) NOT NULL,
    patient_identifier TEXT,
    patient_name TEXT,
    patient_email TEXT,
    patient_phone TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    google_calendar_event_id TEXT,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_therapists_specialties ON public.therapists USING GIN(specialties);
CREATE INDEX idx_therapists_insurance ON public.therapists USING GIN(accepted_insurance);
CREATE INDEX idx_inquiries_status ON public.inquiries(status);
CREATE INDEX idx_inquiries_created_at ON public.inquiries(created_at DESC);
CREATE INDEX idx_appointments_therapist_id ON public.appointments(therapist_id);
CREATE INDEX idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_therapists_updated_at BEFORE UPDATE ON public.therapists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON public.inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample therapists data
INSERT INTO public.therapists (name, email, bio, specialties, accepted_insurance, google_calendar_id) VALUES
('Dr. Sarah Johnson', 'sarah.johnson@example.com', 'Licensed Clinical Psychologist specializing in anxiety disorders, depression, and trauma recovery. Over 15 years of experience helping individuals navigate life challenges.', ARRAY['anxiety', 'depression', 'trauma', 'ptsd'], ARRAY['aetna', 'bluecross', 'cigna', 'united'], 'sarah.johnson@example.com'),
('Dr. Michael Chen', 'michael.chen@example.com', 'Board-certified Psychiatrist with expertise in mood disorders, bipolar disorder, and medication management. Integrative approach combining therapy and pharmacology.', ARRAY['bipolar', 'depression', 'mood disorders', 'medication management'], ARRAY['aetna', 'medicare', 'medicaid'], 'michael.chen@example.com'),
('Dr. Emily Rodriguez', 'emily.rodriguez@example.com', 'Marriage and Family Therapist specializing in relationship issues, couples counseling, and family dynamics. Certified in Gottman Method.', ARRAY['couples therapy', 'relationship issues', 'family therapy', 'communication'], ARRAY['bluecross', 'cigna', 'humana'], 'emily.rodriguez@example.com'),
('Dr. James Williams', 'james.williams@example.com', 'Clinical Social Worker focused on addiction recovery, substance abuse, and dual diagnosis treatment. Trauma-informed care specialist.', ARRAY['addiction', 'substance abuse', 'trauma', 'dual diagnosis'], ARRAY['aetna', 'bluecross', 'united', 'cigna'], 'james.williams@example.com'),
('Dr. Lisa Thompson', 'lisa.thompson@example.com', 'Child and Adolescent Psychologist with expertise in ADHD, autism spectrum disorders, and developmental challenges. Play therapy certified.', ARRAY['child therapy', 'adhd', 'autism', 'developmental disorders'], ARRAY['medicare', 'medicaid', 'bluecross'], 'lisa.thompson@example.com'),
('Dr. Robert Martinez', 'robert.martinez@example.com', 'Licensed Professional Counselor specializing in career counseling, life transitions, and stress management. Mindfulness-based approaches.', ARRAY['career counseling', 'stress management', 'life transitions', 'mindfulness'], ARRAY['aetna', 'cigna', 'united'], 'robert.martinez@example.com'),
('Dr. Amanda Davis', 'amanda.davis@example.com', 'Clinical Psychologist specializing in eating disorders, body image issues, and women''s mental health. Cognitive Behavioral Therapy expert.', ARRAY['eating disorders', 'body image', 'womens health', 'cbt'], ARRAY['aetna', 'bluecross', 'humana'], 'amanda.davis@example.com'),
('Dr. David Lee', 'david.lee@example.com', 'Geriatric Psychiatrist with focus on aging-related mental health, dementia care, and late-life depression. Compassionate care for seniors.', ARRAY['geriatric', 'dementia', 'depression', 'aging'], ARRAY['medicare', 'medicaid', 'aetna'], 'david.lee@example.com');

