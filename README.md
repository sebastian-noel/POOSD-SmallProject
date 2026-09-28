# POOSD Small Project

Contact manager project for COP 4331C with Dr. Aashish Yadavally.

## Project areas

- `login/` - login page and API integration
- `contacts/` - contact-management page and API integration
- `database/` - database schema, seed data, verification queries, and ERD
- `php/README.md` - API request validation, status codes, and isolated tests
- `php/Openapi.yaml` - Swagger 2.0 API definition for this revision (publish after deployment)
- `docs/api-demo.md` - SwaggerHub link, rehearsal evidence, and presentation script
- `docs/aws-setup.md` - AWS architecture, verified infrastructure, and database
  teammate handoff

## AWS architecture

The application uses a LAMP-compatible AWS deployment:

```text
Browser -> EC2 (Amazon Linux, Apache, PHP API) -> RDS for MySQL
```

Copy `.env.example` to an ignored `.env` file when configuring the backend.
Never commit database passwords, AWS credentials, or EC2 private keys.

See [the AWS setup and database handoff](docs/aws-setup.md) for the current
infrastructure status and database integration steps.

## Original ERD revision

This revision uses username/password accounts and the contact fields shown in
the original ERD. User email, contact address, and notes have been removed.
Styling is unchanged. Existing deployments require a coordinated schema and
application cutover; follow [the transition handoff](docs/original-erd-transition.md).
The included copy script retains the original database instead of dropping its data.

## Local preview

Start Docker Desktop, then run from this folder:

```sh
bash scripts/preview.sh
```

Open the loopback URL printed by the script. Sign in as `Huey`, `Dewey`, or
`Louie` with `ContactDemo123!`, or create a local test account. This preview uses
its own MySQL container and never loads the repository's server `.env`. Local
test data persists between stops. Live source files are mounted read-only into
PHP, so edits appear after refreshing the page.

The script explicitly enables a separate HTTP-compatible preview session cookie
on loopback. HTTPS-only production cookies and Apache behavior are unchanged.

`bash scripts/preview.sh status` prints the current URL;
`bash scripts/preview.sh stop` stops the containers without deleting test data.
This is for development only; the presentation must use the deployed domain.
