-- Read-only checks. Select the contact_manager database before running.
SHOW TABLES;
SHOW CREATE TABLE users;
SHOW CREATE TABLE contacts;

SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS contact_count FROM contacts;

SELECT id, username, email, created_at FROM users ORDER BY id;
SELECT id, user_id, first_name, last_name, email, phone, address, notes,
       created_at, updated_at
FROM contacts
ORDER BY user_id, last_name, first_name;

-- Expected: 0. Every contact must reference an existing user.
SELECT COUNT(*) AS orphaned_contacts
FROM contacts AS c
LEFT JOIN users AS u ON u.id = c.user_id
WHERE u.id IS NULL;

-- Resolve IDs from seeded emails; IDs need not start at 1.
SELECT id, username, email FROM users WHERE email = 'huey@example.com';
SELECT c.*
FROM contacts AS c
JOIN users AS u ON u.id = c.user_id
WHERE u.email = 'huey@example.com' AND c.email = 'jon.doe@example.com';

-- Same substring query as the API, using a literal test term.
-- Expected after seeding: Jon Doe and Joanna Jones for Huey.
SELECT c.id, c.first_name, c.last_name
FROM contacts AS c
JOIN users AS u ON u.id = c.user_id
WHERE u.email = 'huey@example.com'
  AND (c.first_name LIKE '%jo%' OR c.last_name LIKE '%jo%'
       OR c.email LIKE '%jo%' OR c.phone LIKE '%jo%')
ORDER BY c.last_name, c.first_name;

-- Expected: John Jones for Dewey, even with an uppercase search term.
SELECT c.id, c.first_name, c.last_name
FROM contacts AS c
JOIN users AS u ON u.id = c.user_id
WHERE u.email = 'dewey@example.com'
  AND (c.first_name LIKE '%JO%' OR c.last_name LIKE '%JO%'
       OR c.email LIKE '%JO%' OR c.phone LIKE '%JO%')
ORDER BY c.last_name, c.first_name;
