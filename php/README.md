# PHP API validation

The source routes are `/php/auth/{register,login,logout,me}.php` and
`/php/contacts.php`. Deployment may add Apache aliases; confirm those separately.
All error responses use `{"message":"..."}`.

## Request rules

Registration, login, contact creation, and contact updates require
`Content-Type: application/json` (an optional charset is accepted), a JSON
object, and a body no larger than 1,048,576 bytes. Arrays, scalar JSON values,
invalid UTF-8, malformed JSON, and nesting beyond the parser's 64-level depth
limit are rejected. Unknown fields are ignored; contact ownership always comes
from the PHP session.

Provided text fields must be strings, including optional fields. `null`, arrays,
objects, numbers, and booleans are not coerced to text. Omit an optional field or
send `""` to leave it blank. Non-password text is trimmed and cannot contain null
bytes. Character limits count Unicode characters; byte limits count UTF-8 bytes.

| Field | Rule |
| --- | --- |
| Registration/login username | Required, at most 50 characters |
| Registration password | At least 8 characters, at most 72 bytes; spaces are preserved; no null bytes |
| Login password | Required nonempty string; spaces are preserved; no null bytes |
| Login rememberMe | Optional JSON boolean, defaults to false |
| Contact first_name / last_name | Required for POST and PUT, at most 50 characters each |
| Contact email | Optional; valid email when nonempty, at most 60 characters |
| Contact phone | Optional string, at most 20 characters; no numeric coercion |
| Contact id query parameter | Decimal integer 1–2,147,483,647, no signs, spaces, leading zeros, fractions, or arrays |
| Contact search query parameter | Optional string, at most 254 characters; blank returns the user's list |

PUT replaces all editable fields; omitted optional fields become empty strings.
It is not a partial PATCH. `id` takes precedence over `search` on GET. Search uses
server-side substring matching against first name, last name, email, and phone;
`%`, `_`, and backslashes are escaped for literal matching.

The new-registration password byte cap prevents bcrypt's silent truncation.
Login retains compatibility with existing passwords rather than imposing the
new signup length rules. See the [PHP password_hash documentation](https://www.php.net/password-hash).

## Status codes

| Status | Meaning |
| --- | --- |
| 200 | Successful login, session lookup, logout, contact read/update/delete |
| 201 | User or contact created |
| 400 | Invalid body, field, or query parameter |
| 401 | Missing/invalid login session or incorrect credentials |
| 404 | Contact missing or belongs to another user |
| 405 | Unsupported method; the Allow header names accepted methods |
| 409 | Username already used, including a duplicate-key insert race |
| 413 | Request body exceeds 1 MiB |
| 415 | Missing or unsupported Content-Type on an endpoint that reads a body |
| 500 | Database/runtime failure, with no SQL or stack trace in the response |

Contact endpoints require login before validating the body or query parameters.
Logout does not require a request body. Unexpected exceptions are logged by type
and code and return `Internal server error`; connection failures retain the
existing `Database connection failed` message.

## Verification

With Docker running and Node.js 22 or newer installed, run from the repo root:

```sh
bash tests/run-api-validation.sh
```

The runner creates disposable MySQL 8.4 and PHP 8.3 containers, imports the schema,
demo fixtures, and test-only error triggers, and runs HTTP assertions. App
directories are mounted individually, so a real `.env` cannot redirect tests to
another database. The containers and
network are removed on exit. No application server or production database is
needed. The first run may download images and compile the PDO MySQL extension.
Seeded logins and valid test-user passwords are generated at runtime; no shared
demo password is required. The runner passes the generated seed credential to
the API test through `API_TEST_SEED_PASSWORD`.

Tests cover field types and limits, malformed requests, method/status headers,
partial search, contact ownership, failed updates, and generic database errors.
The duplicate-key fixture deterministically exercises the insert error path; it
does not simulate the timing of two concurrent registrations.

Run `node --test tests/contact-save.test.cjs` for contact form regressions and
`bash tests/run-schema-migration.sh` for the non-destructive database-copy tests.
Run `node tests/seed-demo.cjs` with Docker available to check seed-password
validation, fresh bcrypt salts, and the limited preview password update.
With Playwright installed and Chromium available, set `API_TEST_BROWSER=1` when
running the API runner to include the real-browser signup/login/CRUD/search/logout
flow. `PLAYWRIGHT_CHANNEL=chrome` uses an installed Chrome instead of Playwright's
bundled Chromium. The browser helper accepts only the disposable loopback URL.

## Original ERD contract

Accounts contain no email. Register/login with `{ "username": "Huey", "password": "..." }`.
User responses contain `id` and `username`; password hashes are never returned.
Contacts contain only the eight ERD fields. SQL `users.userID` and
`contacts.UserID` are exposed as JSON `user.id` and `contact.user_id` to keep
the frontend ID contract stable. Contact email is limited to 60 characters.
See [the deployment transition](../docs/original-erd-transition.md) before
switching an existing server; old-schema databases are not compatible.

## Local preview sessions

`scripts/preview.sh` sets `CONTACT_MANAGER_LOCAL_PREVIEW=1` for its loopback-only
PHP development server. Only that explicit flag together with PHP's `cli-server`
SAPI, a loopback Host header, and HTTP enables `POOSD_PREVIEW_SESSION` without
Secure. HttpOnly and SameSite=Lax remain enabled. This permits browsers that
reject Secure cookies on plain HTTP loopback to retain the login session.
Default deployments, Apache, HTTPS, and non-loopback hosts keep Secure PHPSESSID
cookies. Remember-me and logout use the same cookie settings as session creation.

After starting the preview, run
`PREVIEW_TEST_BASE_URL=http://127.0.0.1:PORT node tests/preview-session.mjs`
with its printed port. The check reads `.env.preview-password` locally (or
`PREVIEW_TEST_PASSWORD` if supplied) and does not print the credential.
