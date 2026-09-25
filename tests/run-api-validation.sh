#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
docker_bin="${DOCKER_BIN:-docker}"
if ! command -v "$docker_bin" >/dev/null 2>&1; then
    docker_bin=/Applications/Docker.app/Contents/Resources/bin/docker
fi
command -v "$docker_bin" >/dev/null
command -v node >/dev/null
"$docker_bin" info >/dev/null

test_name="poosd-api-test-$$"
db_name="$test_name-db"
php_name="$test_name-php"
cleanup() {
    "$docker_bin" rm -f "$php_name" "$db_name" >/dev/null 2>&1 || true
    "$docker_bin" network rm "$test_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"$docker_bin" network create "$test_name" >/dev/null
"$docker_bin" run -d --name "$db_name" --network "$test_name" \
    --tmpfs /var/lib/mysql \
    -e MYSQL_ROOT_PASSWORD=disposable-test-root \
    -e MYSQL_DATABASE=contact_manager \
    -e MYSQL_USER=contact_test -e MYSQL_PASSWORD=disposable-test-password \
    mysql:8.4 >/dev/null

# Only mount PHP files: a real repository .env must never override test settings.
"$docker_bin" run -d --name "$php_name" --network "$test_name" \
    -p 127.0.0.1::8080 -v "$repo_dir/php:/app/php:ro" \
    -e DB_HOST="$db_name" -e DB_NAME=contact_manager \
    -e DB_USER=contact_test -e DB_PASSWORD=disposable-test-password \
    php:8.3-cli sh -c 'docker-php-ext-install pdo_mysql >/tmp/php-build.log 2>&1 && php -S 0.0.0.0:8080 -t /app' >/dev/null

ready=false
for ((attempt = 0; attempt < 90; attempt++)); do
    if "$docker_bin" exec -e MYSQL_PWD=disposable-test-root "$db_name" \
        mysqladmin ping -h 127.0.0.1 -uroot --silent >/dev/null 2>&1 &&
        "$docker_bin" logs "$php_name" 2>&1 | grep -q 'Development Server'; then
        ready=true
        break
    fi
    sleep 1
done
if [ "$ready" != true ]; then
    echo 'The disposable PHP/MySQL services did not become ready.' >&2
    "$docker_bin" logs --tail 15 "$php_name" >&2
    exit 1
fi

for sql_file in "$repo_dir/database/schema.sql" "$repo_dir/tests/fixtures/api-errors.sql"; do
    "$docker_bin" exec -i -e MYSQL_PWD=disposable-test-root "$db_name" \
        mysql -uroot contact_manager < "$sql_file"
done
"$docker_bin" exec "$php_name" sh -c 'for file in /app/php/*.php /app/php/auth/*.php; do php -l "$file" || exit 1; done'
port="$("$docker_bin" port "$php_name" 8080/tcp | sed 's/.*://')"
API_TEST_BASE_URL="http://127.0.0.1:$port" node "$repo_dir/tests/api-validation.mjs"
