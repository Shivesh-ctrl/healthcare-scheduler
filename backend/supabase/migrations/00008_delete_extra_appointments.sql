-- Delete all appointments except the one for Shivesh Srivastava with Tykisha Bays on 15/12/2025 at 10:00

-- First, let's see what appointments exist (for verification)
SELECT 
  a.id,
  a.patient_name,
  a.patient_email,
  t.name as therapist_name,
  a.start_time,
  a.created_at
FROM appointments a
LEFT JOIN therapists t ON a.therapist_id = t.id
ORDER BY a.created_at DESC;

-- Delete appointments that don't match the criteria
-- Keep only: Shivesh Srivastava, shiveshsriv@gmail.com, Tykisha Bays, 2025-12-15 at 10:00
DELETE FROM appointments
WHERE NOT (
  patient_name = 'Shivesh Srivastava' 
  AND patient_email = 'shiveshsriv@gmail.com'
  AND start_time::date = '2025-12-15'::date
  AND EXTRACT(HOUR FROM start_time AT TIME ZONE 'UTC') = 10
  AND therapist_id IN (
    SELECT id FROM therapists WHERE name LIKE '%Tykisha Bays%'
  )
);

-- Verify deletion - should only show one appointment
SELECT 
  a.id,
  a.patient_name,
  a.patient_email,
  t.name as therapist_name,
  a.start_time,
  a.created_at
FROM appointments a
LEFT JOIN therapists t ON a.therapist_id = t.id
ORDER BY a.created_at DESC;

