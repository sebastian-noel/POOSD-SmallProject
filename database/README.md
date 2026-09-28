# Contact manager database — original ERD

The exact team ERD image is retained. This schema uses its four User fields and
eight Contact fields. Accounts sign in with usernames; user email, contact
address, and notes are not stored in this schema.

## Setup

For a fresh MySQL 8.4 database, run `schema.sql`, optionally `seed.sql`, then
`verification.sql`. Seed data is for an empty disposable/demo database only.
The scripts do not update an existing schema or erase old data.

For an existing deployment, follow [the transition handoff](../docs/original-erd-transition.md).
`copy-from-previous-schema.sql` copies supported fields into a separate, empty
database and leaves the old database intact. Deploy PHP and the changed forms
together with the new database configuration.

## Diagram-to-SQL mapping

| ERD label | SQL column | Type |
| --- | --- | --- |
| User: userID | `users.userID` | INT, auto-increment primary key |
| User Name | `username` | VARCHAR(50), unique |
| Password | `password_hash` | VARCHAR(200), PHP password hash |
| Created At | `created_at` | TIMESTAMP, default CURRENT_TIMESTAMP |
| Contact: Id | `contacts.id` | INT, auto-increment primary key |
| UserID | `UserID` | INT, foreign key to `users.userID` |
| First Name | `first_name` | VARCHAR(50) |
| Last Name | `last_name` | VARCHAR(50) |
| Email | `email` | VARCHAR(60), default empty string |
| Phone | `phone` | VARCHAR(20), default empty string |
| Created At | `created_at` | TIMESTAMP, default CURRENT_TIMESTAMP |
| Updated At | `updated_at` | TIMESTAMP, default and ON UPDATE CURRENT_TIMESTAMP |

All columns are NOT NULL. Password is a hash, never plaintext.
`CURRENT_TIMESTAMP` in the drawing describes the default; it is not a SQL data
type. The diagram's Adds/Updates/Deletes labels describe the app operations.
Actual ownership is one user to zero or many contacts, enforced by the foreign
key and API session filtering. A contact cannot have a missing or shared owner.

The JSON API keeps `user.id` and `contact.user_id` as aliases for the SQL key
names. These aliases are not additional stored fields.

Both tables use InnoDB and utf8mb4_0900_ai_ci. Usernames and searches are
case-insensitive. The composite contact index supports owner filtering and name
ordering; it does not turn a substring LIKE query into an indexed prefix search.

## Demo accounts

All accounts use the public test password `ContactDemo123!`; seed data contains
PHP-generated bcrypt hashes. Do not load these public credentials into a database
with real personal data.

| Login username | Contacts |
| --- | --- |
| Huey | Jon Doe; Joanna Jones |
| Dewey | John Jones; Mario Mario |
| Louie | Chew Bacca |

After seeding, expect three users, five contacts, and zero orphaned contacts.
Searching `jo` as Huey returns Jon and Joanna; as Dewey it returns John only.
`verification.sql` is read-only and does not print password hashes.
