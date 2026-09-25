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
| Registration username | Required, at most 50 characters |
| Registration/login email | Required, valid email, at most 254 characters |
| Registration password | At least 8 characters, at most 72 bytes; spaces are preserved; no null bytes |
| Login password | Required nonempty string; spaces are preserved; no null bytes |
| Login rememberMe | Optional JSON boolean, defaults to false |
| Contact first_name / last_name | Required for POST and PUT, at most 50 characters each |
| Contact email | Optional; valid email when nonempty, at most 254 characters |
| Contact phone | Optional string, at most 20 characters; no numeric coercion |
| Contact address | Optional string, at most 255 characters |
| Contact notes | Optional string, at most 65,535 bytes (MySQL TEXT) |
| Contact id query parameter | Decimal integer 1–4,294,967,295, no signs, spaces, leading zeros, fractions, or arrays |
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
| 409 | Username or email already used, including a duplicate-key insert race |
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

The runner creates disposable MySQL 8.4 and PHP 8.3 containers, imports the schema
and test-only error triggers, and runs HTTP assertions. It mounts only `php/`,
so a real `.env` cannot redirect tests to another database. The containers and
network are removed on exit. No application server or production database is
needed. The first run may download images and compile the PDO MySQL extension.

Tests cover field types and limits, malformed requests, method/status headers,
partial search, contact ownership, failed updates, and generic database errors.
The duplicate-key fixture deterministically exercises the insert error path; it
does not simulate the timing of two concurrent registrations.
