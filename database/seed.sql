-- Optional fixtures for a fresh test database. Run once after schema.sql.
-- Generate with scripts/seed-demo.php, which sets @demo_password_hash at runtime.
-- Importing without that variable fails the NOT NULL constraint; no default login.
-- Account uniqueness rejects a second import without overwriting existing users.
START TRANSACTION;

INSERT INTO users (username, password_hash) VALUES
    ('Huey', @demo_password_hash),
    ('Dewey', @demo_password_hash),
    ('Louie', @demo_password_hash);

SET @huey_id = (SELECT userID FROM users WHERE username = 'Huey');
SET @dewey_id = (SELECT userID FROM users WHERE username = 'Dewey');
SET @louie_id = (SELECT userID FROM users WHERE username = 'Louie');

INSERT INTO contacts (UserID, first_name, last_name, email, phone) VALUES
    (@huey_id, 'Jon', 'Doe', 'jon.doe@example.com', '407-555-0101'),
    (@huey_id, 'Joanna', 'Jones', 'joanna.jones@example.com', '407-555-0102'),
    (@dewey_id, 'John', 'Jones', 'john.jones@example.com', '407-555-0103'),
    (@dewey_id, 'Mario', 'Mario', 'mario@example.com', '407-555-0104'),
    (@louie_id, 'Chew', 'Bacca', 'chew.bacca@example.com', '407-555-0105');

COMMIT;
