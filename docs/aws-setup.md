# AWS Infrastructure and Database Handoff

Last verified: September 20, 2026

## Ownership

| Area | Owner |
| --- | --- |
| EC2, RDS, networking, and connectivity | AWS infrastructure teammate |
| Schema, seed data, verification queries, and ERD | Database teammate |
| Applying reviewed SQL to RDS and integration testing | Shared |

## Architecture

```text
User's browser
      |
      | HTTP/HTTPS and JSON
      v
Amazon EC2
Amazon Linux 2023 + Apache + PHP API
      |
      | Private MySQL connection on port 3306
      v
Amazon RDS
MySQL 8.4.9 + contact_manager database
```

EC2 is the Linux application server. It will host the frontend and PHP API,
receive web requests through Apache, and connect privately to RDS.

RDS is the managed MySQL database server. It stores users, password hashes,
contacts, and contact ownership relationships. Browser code must never connect
directly to RDS.

## Verified AWS state

```text
Region: us-east-1
EC2 operating system: Amazon Linux 2023
RDS identifier: contact-manager-db
Database engine: MySQL 8.4.9
Database port: 3306
Database name: contact_manager
Connection path: EC2 -> RDS
RDS CA certificate on EC2: ~/global-bundle.pem
```

The RDS endpoint and all credentials must be shared privately. They do not
belong in this public repository.

AWS created dedicated `ec2-rds-*` and `rds-ec2-*` security groups for the
connection. The RDS group permits MySQL traffic from the EC2 connection group,
not from the public internet.

## Installed EC2 software

```text
httpd
php
php-fpm
php-mysqli
php-json
mariadb105
```

The AWS RDS certificate bundle was downloaded from:

```text
https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

Connectivity was verified from EC2 with:

```sql
SELECT VERSION();
SELECT CURRENT_TIMESTAMP;
SHOW DATABASES;
USE contact_manager;
SELECT DATABASE();
```

## Security requirements

- Keep RDS private and do not allow port 3306 from `0.0.0.0/0`.
- Never commit `.env`, database passwords, AWS credentials, or private keys.
- Never share an EC2 `.pem` private key.
- Use fake personal data in seed files.
- Store password hashes, never plaintext passwords.
- The PHP API must eventually use a restricted application database user
  instead of the RDS administrator.

## Database teammate workflow

### 1. Prepare a branch

Clone the repository if necessary, then update `main` and create a branch:

```bash
git clone https://github.com/sebastian-noel/POOSD-SmallProject.git
cd POOSD-SmallProject
git switch main
git pull
git switch -c feature/database-schema
```

If the repository is already cloned, skip the first two commands.

### 2. Create the database files

```text
database/
|-- schema.sql
|-- seed.sql
|-- verification.sql
|-- README.md
`-- erd.png
```

### 3. Implement `schema.sql`

Create `users` before `contacts`.

The `users` table needs at least:

```text
id
username or email
password_hash
created_at
```

The `contacts` table needs at least:

```text
id
user_id
first_name
last_name
email
phone
created_at
updated_at
```

Schema requirements:

- Give both tables primary keys.
- Make `contacts.user_id` a foreign key referencing `users.id`.
- Use appropriate `BIGINT`, `VARCHAR`, and `TIMESTAMP` types.
- Add an index that supports retrieving a user's contacts by name.
- Make the password-hash column large enough for PHP password hashes.
- Prefer `CREATE TABLE IF NOT EXISTS` for repeatable setup.
- Do not include credentials in SQL files.

### 4. Implement `seed.sql`

Add multiple fake users and contacts. Include names such as John, Jones, and
Joanna so partial search can be demonstrated. Use fake email addresses, phone
numbers, and password hashes only.

### 5. Implement `verification.sql`

Include at least:

```sql
SHOW TABLES;
DESCRIBE users;
DESCRIBE contacts;

SELECT * FROM users;
SELECT * FROM contacts;

SELECT * FROM users WHERE id = 1;
SELECT * FROM contacts WHERE id = 1;
```

Also verify partial, case-insensitive first-name and last-name search:

```sql
SELECT *
FROM contacts
WHERE user_id = 1
  AND (
    LOWER(first_name) LIKE '%jo%'
    OR LOWER(last_name) LIKE '%jo%'
  );
```

The PHP API must use prepared parameters instead of inserting user input
directly into this query.

### 6. Create the ERD

The ERD must match `schema.sql` and show this one-to-many relationship:

```text
users.id  1 -------- many  contacts.user_id
```

### 7. Commit the database work

```bash
git add database
git commit -m "Add contact manager database schema and seed data"
git push -u origin feature/database-schema
```

Open a pull request and have the SQL reviewed before it is applied to RDS.

## Applying reviewed SQL from EC2

The AWS infrastructure teammate should pull the reviewed files onto EC2 and run
the following commands during a shared integration session. Replace
`RDS_ENDPOINT` locally with the endpoint shared through the team's secure
channel. Enter the password only at the prompt.

Apply the schema:

```bash
mysql \
  -h RDS_ENDPOINT \
  -P 3306 \
  -u dbadmin \
  -p \
  --ssl \
  --ssl-ca="$HOME/global-bundle.pem" \
  --ssl-verify-server-cert \
  contact_manager < database/schema.sql
```

Load the test data:

```bash
mysql \
  -h RDS_ENDPOINT \
  -P 3306 \
  -u dbadmin \
  -p \
  --ssl \
  --ssl-ca="$HOME/global-bundle.pem" \
  --ssl-verify-server-cert \
  contact_manager < database/seed.sql
```

Run verification:

```bash
mysql \
  -h RDS_ENDPOINT \
  -P 3306 \
  -u dbadmin \
  -p \
  --ssl \
  --ssl-ca="$HOME/global-bundle.pem" \
  --ssl-verify-server-cert \
  contact_manager < database/verification.sql
```

## Final integration checklist

- [ ] `users` and `contacts` exist.
- [ ] Every contact references a valid user.
- [ ] Test data contains no real personal information.
- [ ] Password values are hashes.
- [ ] Selecting all rows and individual records by ID works.
- [ ] Partial, case-insensitive first-name and last-name search works.
- [ ] The SQL scripts complete without errors.
- [ ] The ERD matches the implemented schema.
- [ ] No credentials or private keys are present in GitHub.
- [ ] The API team receives restricted application credentials separately.

Once this checklist passes, the database is ready for the PHP API team.
