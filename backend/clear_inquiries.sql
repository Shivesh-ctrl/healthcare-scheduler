-- Clear all inquiries (conversation history) for fresh testing
DELETE FROM inquiries WHERE id IS NOT NULL;

-- Reset the sequence if needed
SELECT setval(pg_get_serial_sequence('inquiries', 'id'), 1, false);
