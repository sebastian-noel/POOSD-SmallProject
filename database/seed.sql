-- Optional fixtures for a fresh test database. Run once after schema.sql.
-- All demo accounts use ContactDemo123!; these are PHP-generated bcrypt hashes.
-- Account uniqueness rejects a second import without overwriting existing users.
START TRANSACTION;

INSERT INTO users (username, email, password_hash) VALUES
    ('Huey', 'huey@example.com', '$2y$10$K/2yH8YU8dRQWYBHzfP8gek/Ei5ropkoNyo/pXIq.x682aWXa8BvG'),
    ('Dewey', 'dewey@example.com', '$2y$10$qd0IZMAffaIYHhKQWhbM0O/SbKJD2wAu0i5O7ssc1raJXKjBW5d06'),
    ('Louie', 'louie@example.com', '$2y$10$KaImnZOFCRLRomN5fy6itOlZvdBN8Y7EPFhlDpRwg9cgl9JQfOQem');

SET @huey_id = (SELECT id FROM users WHERE email = 'huey@example.com');
SET @dewey_id = (SELECT id FROM users WHERE email = 'dewey@example.com');
SET @louie_id = (SELECT id FROM users WHERE email = 'louie@example.com');

INSERT INTO contacts (user_id, first_name, last_name, email, phone, address, notes) VALUES
    (@huey_id, 'Jon', 'Doe', 'jon.doe@example.com', '407-555-0101', '', 'Met in class'),
    (@huey_id, 'Joanna', 'Jones', 'joanna.jones@example.com', '407-555-0102', '', 'Study group'),
    (@dewey_id, 'John', 'Jones', 'john.jones@example.com', '407-555-0103', '', 'Lab partner'),
    (@dewey_id, 'Mario', 'Mario', 'mario@example.com', '407-555-0104', '', ''),
    (@louie_id, 'Chew', 'Bacca', 'chew.bacca@example.com', '407-555-0105', '', '');

COMMIT;
