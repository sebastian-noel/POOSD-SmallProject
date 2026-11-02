# POOSD Small Project

Contact manager project for COP 4331C with Dr. Aashish Yadavally.

## Project areas

- `login/` - login page and API integration
- `contacts/` - contact-management page and API integration
- `database/` - database schema, seed data, verification queries, and ERD
- `php/README.md` - API request validation, status codes, and isolated tests
- `php/Openapi.yaml` - Swagger 2.0 API definition for the deployed application
- `docs/api-demo.md` - SwaggerHub link, rehearsal evidence, and presentation script
- `docs/aws-setup.md` - AWS architecture, verified infrastructure, and database
  teammate handoff

## AWS architecture

The application uses a LAMP-compatible AWS deployment:

```text
Browser -> EC2 (Amazon Linux, Apache, PHP API) -> RDS for MySQL
```

## AI Assistance Disclosure

This project was developed with assistance from generative AI tools:

- **Tools**: OpenAI Codex (Sol and Astra) and Anthropic Claude (Opus and Sonnet).

- **Dates**: September 17-28, 2026 for project development
- **Scope**: General assistance throughout all aspects of the project, including
  the frontend, PHP APIs, MySQL database, deployment and configuration, testing,
  and documentation.
- **Nature of use**: Asking questions and learning unfamiliar concepts;
  understanding existing code; generating, debugging, and refining code; and
  creating and using handoff files to share context and collaborate as a group.

All AI-assisted code and suggestions incorporated into the project were reviewed,
verified, and tested by group members. The group takes responsibility for the
final implementation, which reflects our understanding of the concepts and
assignment requirements.
