# Original ERD implementation and deployment handoff

This branch makes the app use the fields in the team's original ERD. The exact
supplied image is retained. Login now accepts a username and password; signup no
longer collects a user email; contacts no longer collect address or notes. The
existing CSS, page structure, contact handlers, JSON endpoints, PHP sessions,
ownership checks, and server-side partial search are retained.

## Diagram labels and implementation

`users` has exactly four columns: `userID`, `username`, `password_hash`, and
`created_at`. `contacts` has exactly eight: `id`, `UserID`, `first_name`,
`last_name`, `email`, `phone`, `created_at`, and `updated_at`. IDs are INT;
usernames and names allow 50 characters, contact email 60, phone 20, and password
hashes 200. The API aliases user IDs to the existing JSON `id` / `user_id` names.

The drawing's "Password" means a hash. Labels containing spaces use SQL
snake_case. `CURRENT_TIMESTAMP` in the drawing is implemented as a default on a
TIMESTAMP column, because it is not a MySQL data type. Its Adds/Updates/Deletes
relationships describe available operations; ownership is enforced by the
non-null foreign key from `contacts.UserID` to `users.userID` and the session
filter on every contact query. The drawing itself is not edited.

## Existing database: preserve before switching

Do not apply the new PHP code directly against the old schema. Do not expect
`CREATE TABLE IF NOT EXISTS` to migrate it. These instructions assume the old
database is named `contact_manager` with the schema from main at `4b7ed2d`.
Inspect `SHOW CREATE TABLE` first if the deployed database differs.

1. Take an RDS snapshot or full database backup. Record the currently deployed
   Git revision and database name for rollback.
2. Schedule a short maintenance window and stop application writes. Keep them
   stopped through copying, verification, and switching the app configuration.
3. The database administrator creates a separate empty database, for example
   `contact_manager_original_erd`, with utf8mb4. Grant the deployment/migration
   account read access to the old database and write/routine access to the new
   one. Give the application account only its needed access to the new database.
4. Select the new database in the MySQL client, load `database/schema.sql`, then
   `database/copy-from-previous-schema.sql`. Never use the client's `--force`
   option. Never load demo seed data into a copied database.
5. The copy preserves IDs, usernames, password hashes, owner relationships, and
   timestamps. Existing user emails, addresses, and notes remain in the untouched
   original database; they are not copied into the new schema. It refuses a
   nonempty destination and contact emails longer than 60 characters, hashes
   longer than 200, or IDs outside the new positive INT upper bound. Review any
   incompatible rows with the database teammate; do not silently truncate them.
6. Compare user/contact counts and run `database/verification.sql` on the new
   database. The example search results in that file assume demo fixtures.
7. Deploy this revision's PHP and HTML/JS together and point `DB_NAME` at the new
   database. Reload PHP as needed, invalidate existing PHP sessions, and ask
   users to sign in with their existing username and password. Keeping IDs does
   not require changing passwords.
8. Check registration, login, logout, session restoration, contact CRUD, partial
   search, and two-account isolation on the HTTPS domain before reopening writes.
9. Import `php/Openapi.yaml` (version 2.0.0) into SwaggerHub and rehearse username
   login. The previously published 1.0.0 spec and email-login rehearsal do not
   verify this new contract. Coordinate the presentation slide/script update.

If the copy fails, its inserted rows roll back and the source remains intact.
The helper procedure may remain in the new destination: after addressing the
error, drop only `copy_previous_contact_manager` in that destination before
retrying. Do not drop either database to retry.

Rollback before reopening writes: restore the old application revision and point
it at the untouched original database. If new writes have already been accepted,
first reconcile/export them; switching straight back would hide those new rows.
Retain the old database/backup until the team has checked the new deployment.

No live database, server deployment, or SwaggerHub publication is performed by
the local implementation. Local tests use disposable MySQL databases only.

## Local verification

- 165 HTTP API checks passed against disposable MySQL 8.4 and PHP 8.3, including
  seeded username login, reduced response fields, CRUD, validation, partial
  search, and cross-account ownership protection.
- All 24 contact-save regression tests passed.
- Real Chrome flow passed signup, username login, add/edit, server search,
  no-match results, delete, logout, and dashboard access after logout.
- Database-copy tests passed preserved-record checks, refusal of a nonempty
  destination, oversized-field/ID rejection, and transactional rollback.
- Swagger 2.0 specification validation passed: eight operations documented,
  exactly one tagged for presentation.
- The repository ERD's bytes match the supplied image exactly. All three CSS
  files match the pre-change revision; only the necessary form fields changed.

The new files are not deployed or published. Repeat the presentation checks on
the remote domain after the coordinated transition.
