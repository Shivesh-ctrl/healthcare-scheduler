-- Allow authenticated users to insert their own patient record
CREATE POLICY "Patients can insert own record"
    ON public.patients FOR INSERT
    WITH CHECK (auth.uid() = user_id);

