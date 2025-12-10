-- Verification script to ensure therapists table matches exact requirements
-- This migration verifies and fixes any discrepancies

-- First, let's check if we have exactly 14 therapists
DO $$
DECLARE
    therapist_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO therapist_count FROM public.therapists WHERE is_active = true;
    
    IF therapist_count != 14 THEN
        RAISE NOTICE 'Warning: Expected 14 therapists, found %', therapist_count;
    ELSE
        RAISE NOTICE '✅ Correct number of therapists: 14';
    END IF;
END $$;

-- Verify each therapist has the correct data structure
-- This ensures all required fields are present and properly formatted

-- Check for therapists with missing specialties
DO $$
DECLARE
    missing_specialties INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_specialties 
    FROM public.therapists 
    WHERE is_active = true 
    AND (specialties IS NULL OR array_length(specialties, 1) IS NULL);
    
    IF missing_specialties > 0 THEN
        RAISE NOTICE 'Warning: % therapists have missing specialties', missing_specialties;
    ELSE
        RAISE NOTICE '✅ All therapists have specialties defined';
    END IF;
END $$;

-- Check for therapists with missing insurance
DO $$
DECLARE
    missing_insurance INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_insurance 
    FROM public.therapists 
    WHERE is_active = true 
    AND (accepted_insurance IS NULL OR array_length(accepted_insurance, 1) IS NULL);
    
    IF missing_insurance > 0 THEN
        RAISE NOTICE 'Warning: % therapists have missing insurance info', missing_insurance;
    ELSE
        RAISE NOTICE '✅ All therapists have insurance info defined';
    END IF;
END $$;

-- Verify all therapists have bios
DO $$
DECLARE
    missing_bios INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_bios 
    FROM public.therapists 
    WHERE is_active = true 
    AND (bio IS NULL OR bio = '');
    
    IF missing_bios > 0 THEN
        RAISE NOTICE 'Warning: % therapists have missing bios', missing_bios;
    ELSE
        RAISE NOTICE '✅ All therapists have bios defined';
    END IF;
END $$;

-- Verify all therapists have emails
DO $$
DECLARE
    missing_emails INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_emails 
    FROM public.therapists 
    WHERE is_active = true 
    AND (email IS NULL OR email = '');
    
    IF missing_emails > 0 THEN
        RAISE NOTICE 'Warning: % therapists have missing emails', missing_emails;
    ELSE
        RAISE NOTICE '✅ All therapists have emails defined';
    END IF;
END $$;

-- Summary: This migration just verifies data integrity
-- The actual data should already be correct from migration 00006
-- If any issues are found, they will be logged as notices

