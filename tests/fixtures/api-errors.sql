-- Test-only failure injection, loaded solely into the disposable test database.
DELIMITER //
CREATE TRIGGER test_contact_failure BEFORE INSERT ON contacts FOR EACH ROW
BEGIN
    IF NEW.first_name = '__test_sql_error__' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PRIVATE_DATABASE_DETAILS';
    END IF;
END//

CREATE TRIGGER test_registration_conflict BEFORE INSERT ON users FOR EACH ROW
BEGIN
    IF NEW.username = '__test_duplicate__' THEN
        -- Exercise a duplicate-key error occurring after the pre-insert lookup.
        SIGNAL SQLSTATE '23000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'PRIVATE_DUPLICATE_DETAILS';
    END IF;
END//
DELIMITER ;
