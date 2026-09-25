# Step 6 handoff: SwaggerHub specification and presentation demo

**Owner:** teammate completing the API documentation/demo.
**Status:** handoff only; the OpenAPI file and SwaggerHub project still need work.

Your deliverable is an accurate API definition in SwaggerHub plus a rehearsed
demo against the deployed PHP application. The assignment requires demonstrating
at least one and no more than two API endpoints in SwaggerHub, with at least one
functional during the presentation. Use the real HTTPS domain, not localhost,
an IP address, or a mock server.

## Start here

After the step 5 validation PR is merged, update your checkout from `main` and
create your own feature branch. The login/dashboard integration is a separate
[PR #8](https://github.com/sebastian-noel/POOSD-SmallProject/pull/8); coordinate its
merge/deployment with the team before rehearsing the app demonstration.

Read these files as the source of truth:

- `php/Openapi.yaml`: existing draft; edit this exact filename/capitalization.
- `php/README.md`: request rules, field limits, and response codes from step 5.
- `php/auth/login.php`, `php/auth.php`, and `php/validation.php`: login/session rules.
- `php/contacts.php`: actual queries, ownership checks, and response shapes.
- `database/schema.sql`: stored fields and timestamp types.
- `docs/aws-setup.md`: deployment coordination with the infrastructure teammate.

Get the live domain and confirmed API path from the infrastructure teammate.
With the repository served directly, the base URL is `https://<domain>/php`,
login is `/auth/login.php`, and contacts is `/contacts.php`. Use `/api` only if
the deployed Apache configuration actually maps it to those files.

## What to fix in the current draft

| Current draft | Work to complete |
| --- | --- |
| Placeholder production server ending in `/api` | Replace it with the verified HTTPS domain and API base path |
| Error schema uses `error` | Change it to `message`, matching all PHP responses |
| Contact creation response shows a top-level `id` | Match `{message, contact: {...}}`, including the nested contact ID |
| GET with `id` documented only as a list | Describe `{contact: {...}}` separately from `{contacts: [...]}` |
| Timestamps declared `date-time` | Actual values are MySQL strings such as `2026-09-24 14:00:00`, without a timezone; document that accurately instead of claiming RFC 3339 |
| Missing field limits and error responses | Apply the rules in `php/README.md`, including 400/401/404/405/409/413/415/500 where applicable |
| Contact notes declared as a non-nullable response string | Account for database rows with `notes: null`; input validation still requires a string when the field is supplied |
| Login absent; global cookie security applied everywhere | Add the chosen login operation with `security: []`; require PHPSESSID only for protected operations |

Keep the API definition accurate even for operations you will not present. The
one-to-two limit applies to the demonstrated endpoints, not the total number the
application must implement.

## Recommended two-operation demo

Use **POST `/auth/login.php` followed by GET `/contacts.php?search=...`**. This
shows working authentication and the required server-side partial search without
creating or deleting contacts during the presentation. If the team retains more
operations in the definition, only demonstrate these two.

1. Coordinate a dedicated demo account with fake contacts. For example, give
   account A contacts named Joanna and John, and account B a different contact
   that also matches `jo`. Keep credentials out of the committed spec.
2. Import the updated YAML into the team's SwaggerHub project and resolve all
   validation errors. Record the shared SwaggerHub URL in your demo notes.
3. Send login JSON containing `email`, `password`, and optionally the boolean
   `rememberMe: false`. Verify a real 200 response with `message` and `user`.
4. Confirm the PHP session cookie is used on the search request. Do not assume
   that logging into the app in another tab authenticates SwaggerHub.
5. Search for `jo`. Verify Joanna and John are returned from the server, while
   account B's contact is absent. Change the term to `oann` to demonstrate a
   substring match, then use an unmatched term to show `{"contacts":[]}`.
6. In the same two operations, optionally show a wrong-password 401 or an
   unauthenticated search 401 if time permits. These are additional cases, not
   additional endpoints.

If the session setup cannot be made reliable in time, use the allowed **one
endpoint** option: demonstrate login successfully in SwaggerHub, and show
partial search during the app demo. Tell the team which sequence was rehearsed.

## Resolve SwaggerHub session handling before presentation day

The API uses an HttpOnly PHPSESSID cookie with Secure and SameSite=Lax settings.
Use the SwaggerHub request-routing/authentication controls available to the
team's project, and verify the complete login-to-search sequence against the
live domain. A browser's cross-site cookie policy and a proxy's cookie handling
can differ. Writing a cookie security scheme in YAML alone does not prove the
session will be sent.

[Swagger's cookie-authentication documentation](https://swagger.io/docs/specification/v3_0/authentication/cookie-authentication/)
describes `type: apiKey`, `in: cookie`, `name: PHPSESSID`, and distinguishes
SwaggerHub support from Swagger UI/Editor browser restrictions. Consult the
[SmartBear request-routing guide](https://support.smartbear.com/swagger/portal/docs/en/appendix/routing-requests/routing-api-requests-for--try-it-out-.html)
for the browser/proxy distinction, while checking which controls your actual
SwaggerHub product exposes. The routing guide is for Swagger Portal; it is not
proof of your project's UI or session behavior.

Never commit session values or demo passwords to YAML, screenshots, or public
demo notes. Do not remove contact ownership checks or weaken cookie settings to
make the demo work. If infrastructure changes are needed, coordinate a separate
reviewed change with the API/infrastructure owners.

## Files to deliver in your PR

- Updated `php/Openapi.yaml` that imports into SwaggerHub without errors.
- `docs/api-demo.md` containing the actual domain, SwaggerHub project URL,
  the two selected operations (or the one-operation fallback), setup steps,
  expected responses, and the session setup that was tested. No credentials.
- A short presentation script or API slide notes explaining JSON requests,
  status codes, prepared SQL search, and filtering by the session's user ID.

Keep this handoff as the assignment brief; put your completed evidence and
rehearsal instructions in `docs/api-demo.md`. Open your own PR with the spec and
demo documentation, and include what you verified on the deployed domain.

## Acceptance checklist

- [ ] The YAML matches PHP responses and step 5 validation rules.
- [ ] SwaggerHub imports it without validation errors.
- [ ] All demo requests target the real domain and remote database through PHP.
- [ ] At least one selected endpoint works from SwaggerHub itself.
- [ ] Only one or two endpoints are in the presentation sequence.
- [ ] If search is selected, its cookie/session setup was tested in SwaggerHub.
- [ ] Partial matching and private contact ownership are shown in the API or app demo.
- [ ] The team has the SwaggerHub URL and a repeatable script without exposed secrets.
- [ ] Test the domain on the campus network two days and one day before presenting.
- [ ] Bring the slides and support material on USB; each teammate submits the slides.
