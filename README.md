# POOSD Small Project

Contact manager project for COP 4331C with Dr. Aashish Yadavally.

## Project areas

- `login/` - login page and API integration
- `contacts/` - contact-management page and API integration
- `database/` - database schema, seed data, verification queries, and ERD
- `php/README.md` - API request validation, status codes, and isolated tests
- `docs/step-6-swaggerhub-handoff.md` - teammate handoff for the SwaggerHub spec and demo
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
