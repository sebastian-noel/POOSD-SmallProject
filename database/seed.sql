-- Optional fixtures for a fresh test database. Run once after schema.sql.
-- All demo accounts use ContactDemo123!; these are PHP-generated bcrypt hashes.
-- Account uniqueness rejects a second import without overwriting existing users.
START TRANSACTION;

INSERT INTO users (username, password_hash) VALUES
    ('Huey', '$2y$10$K/2yH8YU8dRQWYBHzfP8gek/Ei5ropkoNyo/pXIq.x682aWXa8BvG'),
    ('Dewey', '$2y$10$qd0IZMAffaIYHhKQWhbM0O/SbKJD2wAu0i5O7ssc1raJXKjBW5d06'),
    ('Louie', '$2y$10$KaImnZOFCRLRomN5fy6itOlZvdBN8Y7EPFhlDpRwg9cgl9JQfOQem');

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
