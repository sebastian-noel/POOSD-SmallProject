-- Copy the previous schema from contact_manager into a NEW, EMPTY database.
-- First create/select the destination and load schema.sql there. Stop app writes
-- during the copy and cutover. The original database is never altered or deleted.
-- This script deliberately fails on oversized values instead of truncating them.
-- Run with mysql's default stop-on-error behavior (never --force).
DELIMITER //
CREATE PROCEDURE copy_previous_contact_manager()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF DATABASE() IS NULL OR DATABASE() = 'contact_manager' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Select a separate destination database; source is contact_manager';
    END IF;

    START TRANSACTION WITH CONSISTENT SNAPSHOT;
    IF (SELECT COUNT(*) FROM users) <> 0 OR (SELECT COUNT(*) FROM contacts) <> 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Destination must be empty; no existing rows will be overwritten';
    END IF;
    IF EXISTS (SELECT 1 FROM contact_manager.users
               WHERE id > 2147483647 OR CHAR_LENGTH(password_hash) > 200)
       OR EXISTS (SELECT 1 FROM contact_manager.contacts
                  WHERE id > 2147483647 OR user_id > 2147483647 OR CHAR_LENGTH(email) > 60) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Existing values exceed the original ERD limits; review before copying';
    END IF;

    INSERT INTO users (userID, username, password_hash, created_at)
        SELECT id, username, password_hash, created_at FROM contact_manager.users;
    INSERT INTO contacts (id, UserID, first_name, last_name, email, phone, created_at, updated_at)
        SELECT id, user_id, first_name, last_name, email, phone, created_at, updated_at
        FROM contact_manager.contacts;
    COMMIT;
END//
DELIMITER ;
CALL copy_previous_contact_manager();
DROP PROCEDURE copy_previous_contact_manager;
