-- Enable Row Level Security
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Therapists policies (public read, admin write)
CREATE POLICY "Therapists are viewable by everyone"
    ON public.therapists FOR SELECT
    USING (true);

CREATE POLICY "Only service role can insert therapists"
    ON public.therapists FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update therapists"
    ON public.therapists FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete therapists"
    ON public.therapists FOR DELETE
    USING (auth.role() = 'service_role');

-- Inquiries policies (restricted access)
CREATE POLICY "Service role can view all inquiries"
    ON public.inquiries FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert inquiries"
    ON public.inquiries FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update inquiries"
    ON public.inquiries FOR UPDATE
    USING (auth.role() = 'service_role');

-- Appointments policies (restricted access)
CREATE POLICY "Service role can view all appointments"
    ON public.appointments FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert appointments"
    ON public.appointments FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update appointments"
    ON public.appointments FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete appointments"
    ON public.appointments FOR DELETE
    USING (auth.role() = 'service_role');

