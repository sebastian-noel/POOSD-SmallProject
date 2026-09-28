#!/usr/bin/env bash
set -euo pipefail

# Local development only. Mount individual folders so a production .env cannot
# override these isolated Docker settings. MySQL has no published host port.
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
docker_bin="${DOCKER_BIN:-docker}"
if ! command -v "$docker_bin" >/dev/null 2>&1; then
    docker_bin=/Applications/Docker.app/Contents/Resources/bin/docker
fi
command -v "$docker_bin" >/dev/null
if ! "$docker_bin" info >/dev/null 2>&1; then
    echo 'Start Docker Desktop, then run this command again.' >&2
    exit 1
fi

preview_name=poosd-original-erd-preview
db_name="$preview_name-db"
php_name="$preview_name-php"
password_file="$repo_dir/.env.preview-password"
exists() { "$docker_bin" container inspect "$1" >/dev/null 2>&1; }
running() { [ "$("$docker_bin" inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = true ]; }
sql() {
    "$docker_bin" exec -i -e MYSQL_PWD=local-preview-root "$db_name" \
        mysql -uroot --batch --skip-column-names contact_manager "$@"
}
show_url() {
    local port
    port="$("$docker_bin" port "$php_name" 8080/tcp | sed 's/.*://')"
    echo "Preview: http://127.0.0.1:$port"
    echo 'Demo username: Huey (or Dewey / Louie)'
    echo "Demo password is stored locally in: $password_file"
    echo 'Test data is local; it is retained when the preview is stopped.'
}

case "${1:-start}" in
    stop)
        for container in "$php_name" "$db_name"; do
            if running "$container"; then "$docker_bin" stop "$container" >/dev/null; fi
        done
        echo 'Preview stopped. Local database data is retained.'
        exit 0
        ;;
    status)
        if running "$php_name" && running "$db_name"; then show_url; else echo 'Preview is stopped.'; fi
        exit 0
        ;;
    start) ;;
    *) echo 'Usage: bash scripts/preview.sh [start|stop|status]' >&2; exit 1 ;;
esac

if ! "$docker_bin" network inspect "$preview_name" >/dev/null 2>&1; then
    "$docker_bin" network create "$preview_name" >/dev/null
fi
if ! exists "$db_name"; then
    "$docker_bin" run -d --name "$db_name" --network "$preview_name" \
        -v "$preview_name-data:/var/lib/mysql" \
        -e MYSQL_ROOT_PASSWORD=local-preview-root -e MYSQL_DATABASE=contact_manager \
        -e MYSQL_USER=contact_preview -e MYSQL_PASSWORD=local-preview-password \
        mysql:8.4 >/dev/null
elif ! running "$db_name"; then
    "$docker_bin" start "$db_name" >/dev/null
fi

ready=false
for ((attempt = 0; attempt < 90; attempt++)); do
    if sql -e 'SELECT 1' >/dev/null 2>&1; then ready=true; break; fi
    sleep 1
done
if [ "$ready" != true ]; then echo 'Local MySQL did not become ready.' >&2; exit 1; fi

table_count="$(sql -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='contact_manager';")"
if [ "$table_count" = 0 ]; then
    sql < "$repo_dir/database/schema.sql"
else
    # Refuse incompatible preview data instead of modifying or deleting it.
    columns="$(sql -e "SELECT CONCAT(table_name, ':', GROUP_CONCAT(column_name ORDER BY ordinal_position)) FROM information_schema.columns WHERE table_schema='contact_manager' GROUP BY table_name ORDER BY table_name;")"
    expected=$'contacts:id,UserID,first_name,last_name,email,phone,created_at,updated_at\nusers:userID,username,password_hash,created_at'
    if [ "$columns" != "$expected" ]; then
        echo 'The existing local preview database has a different schema; no data was changed.' >&2
        exit 1
    fi
fi

# Keep the generated demo credential out of Git and out of routine command output.
# On first upgrade, replace only the three preview sample accounts' old password.
# Contacts and independently registered accounts are left intact.
new_password=false
if [ -f "$password_file" ]; then
    demo_password="$(cat "$password_file")"
else
    demo_password="$(openssl rand -hex 24)"
    new_password=true
fi
if [ "$table_count" = 0 ] || [ "$new_password" = true ]; then
    seed_mode=''
    if [ "$table_count" != 0 ]; then seed_mode=--rotate-password; fi
    printf '%s' "$demo_password" | "$docker_bin" run --rm -i \
        -v "$repo_dir/scripts:/seed/scripts:ro" -v "$repo_dir/database:/seed/database:ro" \
        php:8.3-cli php /seed/scripts/seed-demo.php "$seed_mode" | sql
    if [ "$new_password" = true ]; then
        (umask 077; printf '%s' "$demo_password" > "$password_file")
    fi
fi
chmod 600 "$password_file"
unset demo_password

# Upgrade the app container's preview environment while retaining its port and
# the separate database volume. No contacts/accounts are removed.
publish_address=127.0.0.1::8080
if exists "$php_name" && ! "$docker_bin" inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$php_name" | grep -qx 'CONTACT_MANAGER_LOCAL_PREVIEW=1'; then
    old_port="$("$docker_bin" port "$php_name" 8080/tcp 2>/dev/null | sed 's/.*://' || true)"
    if [ -z "$old_port" ]; then
        old_port="$("$docker_bin" inspect -f '{{(index (index .HostConfig.PortBindings "8080/tcp") 0).HostPort}}' "$php_name")"
    fi
    if [ -n "$old_port" ]; then publish_address="127.0.0.1:$old_port:8080"; fi
    "$docker_bin" rm -f "$php_name" >/dev/null
fi

if ! exists "$php_name"; then
    "$docker_bin" run -d --name "$php_name" --network "$preview_name" \
        -p "$publish_address" -v "$repo_dir/php:/app/php:ro" \
        -v "$repo_dir/login:/app/login:ro" -v "$repo_dir/signup:/app/signup:ro" \
        -v "$repo_dir/contacts:/app/contacts:ro" -v "$repo_dir/index.php:/app/index.php:ro" \
        -e DB_HOST="$db_name" -e DB_NAME=contact_manager \
        -e DB_USER=contact_preview -e DB_PASSWORD=local-preview-password \
        -e CONTACT_MANAGER_LOCAL_PREVIEW=1 \
        php:8.3-cli sh -c 'set -e; if ! php -r '\''exit(extension_loaded("pdo_mysql") ? 0 : 1);'\''; then docker-php-ext-install pdo_mysql >/tmp/php-build.log 2>&1; fi; exec php -S 0.0.0.0:8080 -t /app' >/dev/null
elif ! running "$php_name"; then
    "$docker_bin" start "$php_name" >/dev/null
fi

ready=false
for ((attempt = 0; attempt < 90; attempt++)); do
    if "$docker_bin" exec "$php_name" php -r 'exit(@file_get_contents("http://127.0.0.1:8080/login/index.html") === false ? 1 : 0);' >/dev/null 2>&1; then
        ready=true; break
    fi
    sleep 1
done
if [ "$ready" != true ]; then
    echo 'Local PHP did not become ready. Check the preview container logs.' >&2
    exit 1
fi
show_url
