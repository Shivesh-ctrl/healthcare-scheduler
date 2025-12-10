-- Replace all existing therapists with therapists from Chicago Counseling and Therapy
-- Source: https://chicagocounselingandtherapy.com/meet-the-team/

-- First, handle foreign key constraints
-- Delete existing appointments (they reference old therapists)
DELETE FROM public.appointments;

-- Update inquiries that reference therapists (set to NULL)
UPDATE public.inquiries SET matched_therapist_id = NULL WHERE matched_therapist_id IS NOT NULL;

-- Now delete all existing therapists
DELETE FROM public.therapists;

-- Insert new therapists from Chicago Counseling and Therapy
INSERT INTO public.therapists (name, email, bio, specialties, accepted_insurance, is_active) VALUES
-- 1. Adriane Wilk, LCPC
('Adriane Wilk, LCPC', 'adriane.wilk@chicagocounseling.com', 
 'Licensed Clinical Professional Counselor offering virtual sessions and EMDR. Specializes in anxiety, depression, trauma, substance abuse (clients and family members), life transitions, and chronic illness.',
 ARRAY['anxiety', 'depression', 'trauma', 'substance abuse', 'life transitions', 'chronic illness', 'emdr'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 2. Amber DiCosola, LCPC
('Amber DiCosola, LCPC', 'amber.dicosola@chicagocounseling.com',
 'Licensed Clinical Professional Counselor offering in-office and virtual sessions. Works with individual adults and couples. Specializes in anxiety, depression, life transitions, college-aged students, and relationship stressors.',
 ARRAY['anxiety', 'depression', 'life transitions', 'college students', 'relationship issues', 'couples therapy'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 3. Catherine Watson, LCPC
('Catherine Watson, LCPC', 'catherine.watson@chicagocounseling.com',
 'Clinical Supervisor and Licensed Clinical Professional Counselor offering virtual sessions. Specializes in anxiety, depression, low self-esteem/self-worth, life transitions, college/graduate students, couples/relationship issues, and LGBTQIA+.',
 ARRAY['anxiety', 'depression', 'self-esteem', 'life transitions', 'college students', 'couples therapy', 'lgbtqia+'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 4. Chris Dubois, LPC
('Chris Dubois, LPC', 'chris.dubois@chicagocounseling.com',
 'Licensed Professional Counselor offering in-office and virtual sessions. Specializes in anxiety, depression, marital/relationship issues, low self-esteem/self-worth, college/graduate students, and LGBTQIA+.',
 ARRAY['anxiety', 'depression', 'relationship issues', 'self-esteem', 'college students', 'lgbtqia+'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 5. Clara Gay, LSW
('Clara Gay, LSW', 'clara.gay@chicagocounseling.com',
 'Pre-Licensed Social Worker offering in-office and virtual sessions. Specializes in teenagers (15+), anxiety, depression, low self-esteem/self-worth, college students, and life transitions.',
 ARRAY['teenagers', 'anxiety', 'depression', 'self-esteem', 'college students', 'life transitions'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 6. Claudia Hernandez, LCPC
('Claudia Hernandez, LCPC', 'claudia.hernandez@chicagocounseling.com',
 'Licensed Clinical Professional Counselor offering in-office and virtual sessions, speaks Spanish. Specializes in anxiety, depression, trauma, low self-esteem/self-worth, LGBTQIA+, and college/graduate students.',
 ARRAY['anxiety', 'depression', 'trauma', 'self-esteem', 'lgbtqia+', 'college students'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 7. Dana Norden, LCSW
('Dana Norden, LCSW', 'dana.norden@chicagocounseling.com',
 'Licensed Clinical Social Worker offering in-office and virtual sessions. Specializes in trauma, low self-esteem/self-worth, LGBTQIA+, college/graduate students, artists, musicians, trade workers, marital/pre-marital/relationship issues, and family conflict.',
 ARRAY['trauma', 'self-esteem', 'lgbtqia+', 'college students', 'relationship issues', 'family conflict'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 8. Danielle Kepler, LCPC
('Danielle Kepler, LCPC', 'danielle.kepler@chicagocounseling.com',
 'Practice Owner, Licensed Clinical Professional Counselor, and Certified Gottman Therapist offering in-office and virtual sessions. Specializes in anxiety, depression, life transitions, marital/pre-marital/relationship issues, LGBTQIA+, college/graduate students, and young professionals.',
 ARRAY['anxiety', 'depression', 'life transitions', 'relationship issues', 'lgbtqia+', 'college students', 'young professionals'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 9. Jasmine Goins, LCSW
('Jasmine Goins, LCSW', 'jasmine.goins@chicagocounseling.com',
 'Licensed Clinical Social Worker offering in-office and virtual sessions. Specializes in anxiety, depression, life transitions, grief, low self-esteem/self-worth, college/graduate students, young professionals, and older adults.',
 ARRAY['anxiety', 'depression', 'life transitions', 'grief', 'self-esteem', 'college students', 'young professionals', 'older adults'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 10. Joslyn Mowen, LCPC
('Joslyn Mowen, LCPC', 'joslyn.mowen@chicagocounseling.com',
 'Clinical Director and Licensed Clinical Professional Counselor offering virtual sessions. Specializes in anxiety, depression, life transitions, grief, low self-esteem/self-worth, college/graduate/medical students, young professionals, and marital/pre-marital/relationship issues.',
 ARRAY['anxiety', 'depression', 'life transitions', 'grief', 'self-esteem', 'college students', 'young professionals', 'relationship issues'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 11. Kelsey Kamin, LSW
('Kelsey Kamin, LSW', 'kelsey.kamin@chicagocounseling.com',
 'Licensed Social Worker offering in-office and virtual sessions. Specializes in anxiety, depression, life transitions, low self-esteem/self-worth, college students, young professionals, and marital/pre-marital/relationship issues.',
 ARRAY['anxiety', 'depression', 'life transitions', 'self-esteem', 'college students', 'young professionals', 'relationship issues'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 12. Rachel Kurt, LCPC
('Rachel Kurt, LCPC', 'rachel.kurt@chicagocounseling.com',
 'Licensed Clinical Professional Counselor offering in-office and virtual sessions. Specializes in anxiety, depression, life transitions, grief, low self-esteem/self-worth, college/graduate/medical students, young professionals, and job stressors.',
 ARRAY['anxiety', 'depression', 'life transitions', 'grief', 'self-esteem', 'college students', 'young professionals', 'job stress'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 13. Sydney Walden, LCSW
('Sydney Walden, LCSW', 'sydney.walden@chicagocounseling.com',
 'Clinical Supervisor and Licensed Clinical Social Worker offering in-office and virtual sessions, EMDR-Trained. Specializes in anxiety, loss, trauma, neglect/codependency, LGBTQIA+, STEM workers, healthcare, and academia.',
 ARRAY['anxiety', 'grief', 'trauma', 'codependency', 'lgbtqia+', 'emdr'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true),

-- 14. Tykisha Bays, LSW, CADC
('Tykisha Bays, LSW, CADC', 'tykisha.bays@chicagocounseling.com',
 'Licensed Social Worker and Certified Drug and Addiction Counselor offering in-office and virtual sessions. Specializes in anxiety, depression, alcohol/drug abuse (client and family members), life transitions, low self-esteem/self-worth, job stressors, grief, trauma, pre-marital/relationship issues, LGBTQIA+, college/graduate students, young professionals, and older adults.',
 ARRAY['anxiety', 'depression', 'addiction', 'substance abuse', 'life transitions', 'self-esteem', 'job stress', 'grief', 'trauma', 'relationship issues', 'lgbtqia+', 'college students', 'young professionals', 'older adults'],
 ARRAY['blue cross blue shield', 'aetna', 'cigna', 'united', 'medicare', 'medicaid', 'humana'],
 true);

