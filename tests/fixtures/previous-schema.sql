-- Previous deployed-format fixture, used only in disposable migration tests.
-- Run against the contact_manager database. These names match the PHP API.
-- This creates a fresh schema; it does not migrate existing tables.
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS contacts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(254) NOT NULL DEFAULT '',
    phone VARCHAR(20) NOT NULL DEFAULT '',
    address VARCHAR(255) NOT NULL DEFAULT '',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_contacts_user_name (user_id, last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Optional fixtures for a fresh test database. Run once after schema.sql.
-- Inert hash markers: this migration fixture cannot authenticate any account.
-- Account uniqueness rejects a second import without overwriting existing users.
START TRANSACTION;

INSERT INTO users (username, email, password_hash) VALUES
    ('Huey', 'huey@example.com', 'migration-fixture-huey'),
    ('Dewey', 'dewey@example.com', 'migration-fixture-dewey'),
    ('Louie', 'louie@example.com', 'migration-fixture-louie');

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
