-- Delete all appointments except the one for Shivesh Srivastava with Tykisha Bays on 15/12/2025 at 10:00

-- First, let's see what appointments exist
SELECT 
  id,
  patient_name,
  patient_email,
  therapist_id,
  start_time,
  created_at
FROM appointments
ORDER BY created_at DESC;

-- Delete appointments that don't match the criteria
DELETE FROM appointments
WHERE NOT (
  patient_name = 'Shivesh Srivastava' 
  AND patient_email = 'shiveshsriv@gmail.com'
  AND start_time::date = '2025-12-15'::date
  AND EXTRACT(HOUR FROM start_time) = 10
  AND therapist_id IN (
    SELECT id FROM therapists WHERE name LIKE '%Tykisha Bays%'
  )
);

-- Verify deletion
SELECT 
  id,
  patient_name,
  patient_email,
  therapist_id,
  start_time,
  created_at
FROM appointments
ORDER BY created_at DESC;
