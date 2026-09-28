#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
docker_bin="${DOCKER_BIN:-docker}"
test_name="poosd-schema-test-$$"
cleanup() { "$docker_bin" rm -f "$test_name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"$docker_bin" run -d --name "$test_name" --tmpfs /var/lib/mysql \
    -e MYSQL_ROOT_PASSWORD=disposable-test-root -e MYSQL_DATABASE=contact_manager \
    mysql:8.4 >/dev/null
sql() {
    "$docker_bin" exec -i -e MYSQL_PWD=disposable-test-root "$test_name" \
        mysql -uroot --batch --skip-column-names "$@"
}
ready=false
for ((attempt = 0; attempt < 90; attempt++)); do
    if "$docker_bin" exec -e MYSQL_PWD=disposable-test-root "$test_name" \
        mysqladmin ping -h 127.0.0.1 -uroot --silent >/dev/null 2>&1; then
        ready=true
        break
    fi
    sleep 1
done
if [ "$ready" != true ]; then echo 'Disposable MySQL did not become ready.' >&2; exit 1; fi

sql contact_manager < "$repo_dir/tests/fixtures/previous-schema.sql"
sql -e 'CREATE DATABASE original_erd_test;'
sql original_erd_test < "$repo_dir/database/schema.sql"
copy_schema() { sql original_erd_test < "$repo_dir/database/copy-from-previous-schema.sql"; }
assert_sql() {
    local result
    result="$(sql -e "$2")"
    if [ "$result" != "$1" ]; then echo "FAIL: expected $1; got $result" >&2; exit 1; fi
}
reject_copy() {
    local output
    if output="$(copy_schema 2>&1)"; then echo 'Copy unexpectedly succeeded.' >&2; exit 1; fi
    if [[ "$output" != *"$1"* ]]; then echo "$output" >&2; exit 1; fi
    sql original_erd_test -e 'DROP PROCEDURE copy_previous_contact_manager;'
}

copy_schema
assert_sql '3' 'SELECT COUNT(*) FROM original_erd_test.users;'
assert_sql '5' 'SELECT COUNT(*) FROM original_erd_test.contacts;'
assert_sql '0' 'SELECT COUNT(*) FROM original_erd_test.users n JOIN contact_manager.users o ON n.userID=o.id WHERE n.username<>o.username OR n.password_hash<>o.password_hash OR n.created_at<>o.created_at;'
assert_sql '0' 'SELECT COUNT(*) FROM original_erd_test.contacts n JOIN contact_manager.contacts o ON n.id=o.id WHERE n.UserID<>o.user_id OR n.first_name<>o.first_name OR n.last_name<>o.last_name OR n.email<>o.email OR n.phone<>o.phone OR n.created_at<>o.created_at OR n.updated_at<>o.updated_at;'
assert_sql '4' "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='original_erd_test' AND table_name='users';"
assert_sql '8' "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='original_erd_test' AND table_name='contacts';"
assert_sql '3' "SELECT COUNT(*) FROM contact_manager.users WHERE email<>'';"
assert_sql '3' "SELECT COUNT(*) FROM contact_manager.contacts WHERE notes<>'';"
echo 'PASS existing IDs, credentials, contacts and timestamps copied; original fields preserved'

reject_copy 'Destination must be empty'
assert_sql '3' 'SELECT COUNT(*) FROM original_erd_test.users;'
echo 'PASS nonempty destination refused without overwriting rows'

# Only the disposable target is emptied to exercise rejection and rollback.
sql original_erd_test -e 'DELETE FROM contacts; DELETE FROM users;'
sql contact_manager -e "UPDATE contacts SET email=CONCAT(REPEAT('a',49),'@example.com') WHERE id=1;"
reject_copy 'Existing values exceed'
assert_sql '0' 'SELECT COUNT(*) FROM original_erd_test.users;'
assert_sql '61' 'SELECT CHAR_LENGTH(email) FROM contact_manager.contacts WHERE id=1;'
sql contact_manager -e "UPDATE contacts SET email='jon.doe@example.com' WHERE id=1; UPDATE users SET password_hash=REPEAT('x',201) WHERE id=1;"
reject_copy 'Existing values exceed'
assert_sql '0' 'SELECT COUNT(*) FROM original_erd_test.users;'
sql contact_manager -e "UPDATE users SET password_hash='test-only-hash' WHERE id=1; INSERT INTO users(id,username,email,password_hash) VALUES(2147483648,'LargeId','large@example.com','test-only-hash');"
reject_copy 'Existing values exceed'
assert_sql '0' 'SELECT COUNT(*) FROM original_erd_test.users;'
echo 'PASS oversized emails, password hashes and IDs refused without truncation'

sql contact_manager -e "DELETE FROM users WHERE id=2147483648; SET FOREIGN_KEY_CHECKS=0; INSERT INTO contacts(user_id,first_name,last_name) VALUES(999,'Orphan','Fixture'); SET FOREIGN_KEY_CHECKS=1;"
reject_copy 'foreign key constraint fails'
assert_sql '0' 'SELECT COUNT(*) FROM original_erd_test.users;'
assert_sql '0' 'SELECT COUNT(*) FROM original_erd_test.contacts;'
assert_sql '6' 'SELECT COUNT(*) FROM contact_manager.contacts;'
echo 'PASS a failed contact copy rolls back users too; original database remains intact'
