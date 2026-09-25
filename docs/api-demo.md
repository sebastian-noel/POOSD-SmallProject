# SwaggerHub API demonstration

## Selected presentation sequence

Demonstrate **POST `/auth/login.php` only in SwaggerHub**, then demonstrate
partial contact search in the web application. The assignment allows one or two
API operations in SwaggerHub. The presenter confirmed that login works in
SwaggerHub and search works in the app. Search in SwaggerHub returned
401 because the request had no valid authenticated session; resolving that
session issue is not required for this selected sequence.

The specification documents all eight operations. Only login is tagged
**Presentation**; the remaining operations are reference documentation.

| Item | Status |
| --- | --- |
| Application | [contacts.snoel.dev](https://contacts.snoel.dev) |
| API base URL | `https://contacts.snoel.dev/php` |
| SwaggerHub API | [personal-contact-manager 1.0.0](https://app.swaggerhub.com/apis/ucf-7ce/personal-contact-manager/1.0.0) |
| SwaggerHub owner | `ucf-7ce` |
| Local specification validation | Passed with openapi-spec-validator 0.9.0; eight operations, one presentation operation, no unused definitions |
| SwaggerHub import | Presenter confirmed the final YAML update is saved; zero issues reported |
| SwaggerHub login | Presenter reported Login successful and a user object |
| Application rehearsal | Presenter confirmed add/edit/delete, partial search, and no-match checks completed |
| Contact isolation between accounts | Presenter confirmed the live two-account privacy check passed |
| Team sharing and review | Presenter confirmed the SwaggerHub link/script were shared and the documentation reviewed |

## SwaggerHub setup reference

1. Open the shared API URL above. When updating the definition, replace the
   editor contents with `php/Openapi.yaml`, save, and confirm zero validation
   issues. Login should remain the only Presentation operation.
2. Confirm `host: contacts.snoel.dev`, `basePath: /php`, and `schemes: [https]`.
3. Requests must target the real application, not a mock. If checking integrations,
   click the API name and open Integrations. API Auto Mocking need not be added;
   the target must not be `virtserver.swaggerhub.com`.
4. Check that every presenter can open the shared documentation URL.

[Swagger Studio import instructions](https://support.smartbear.com/swagger/studio/docs/en/manage-apis/import-api-definitions.html)
and [mock integration settings](https://support.smartbear.com/swagger/studio/docs/en/integrations/api-auto-mocking.html).

## Prepare the demo data

Use dedicated accounts with fake contacts and keep passwords and session values
out of saved YAML, notes, screenshots, and recordings. Confirm the deployed
revision and remote database configuration with the infrastructure teammate.

The repository seed provides an example: Huey owns **Jon Doe** and **Joanna
Jones**; Dewey owns **John Jones**. These are expected fixtures, not independently
verified live data. If using different accounts, choose equivalent contacts and
rehearse the expected matches. Do not reapply seed SQL to an existing database.

## 1. Login in SwaggerHub

Expand **Presentation → POST /auth/login.php → Try it out**. Enter the demo
account's email and password in the JSON body with `rememberMe: false`, then
execute with Content-Type `application/json`.

Expected HTTP 200 body (values depend on the account):

```json
{
  "message": "Login successful",
  "user": { "id": 1, "username": "DemoUser", "email": "demo@example.com" }
}
```

Show the request URL, status code, and returned JSON. Optionally repeat this same
operation with an incorrect password to show HTTP 401 and
`{"message":"Invalid email or password"}`. Do not demonstrate additional
SwaggerHub operations in this selected sequence.

## 2. Search in the application

Open [the application](https://contacts.snoel.dev) and log in there separately.
The login performed in SwaggerHub does not establish the application's browser
session. Use the contact search box to demonstrate these cases:

| Search | Expected result for Huey's seed contacts |
| --- | --- |
| `jo` | Jon Doe and Joanna Jones; exclude Dewey's John Jones |
| `oann` | Joanna Jones; proves matching inside a name |
| `zz-no-match-9382` | No contacts found; API returns `{"contacts":[]}` |

To demonstrate privacy, log out and log in as the second account in the app,
then search for `jo` again. With the seed pattern it should show John Jones,
without Huey's contacts. Verify this comparison before presenting.

The browser sends each search to PHP. PHP searches first name, last name, email,
and phone using prepared SQL parameters and filters by the session's user ID.
The client does not implement search by filtering a cached full contact list.

## Short presentation script

**In SwaggerHub:** “This is our PHP API on our HTTPS domain. Login receives JSON,
verifies the password, and creates a session. A successful response returns status
200 with a message and user object. Incorrect credentials return 401.”

**Switch to the app and log in:** “Search sends a new request to PHP, which queries
our remote MySQL database using prepared parameters. Searching for `oann` matches
Joanna inside her name. A term with no matches shows an empty result.”

**Compare accounts:** “Each contact query filters by the user ID in the server
session. Switching accounts shows that each user has their own private contacts.”

## Rehearsal evidence and remaining checks

| Evidence | Result |
| --- | --- |
| Public HTTPS and PHP routes | Verified with curl; details below |
| SwaggerHub login | Presenter reported success message and user object; numeric status not independently captured |
| SwaggerHub search attempt | Screenshot shows GET `https://contacts.snoel.dev/php/contacts.php?search=jo`, HTTP 401, `{"message":"Not logged in"}` |
| Selected sequence | One operation in SwaggerHub, search in app |
| Application rehearsal | Presenter confirmed add/edit/delete, partial search, and unmatched search checks; response bodies not captured |
| Two-account privacy comparison | Presenter confirmed completed successfully |
| Deployed Git revision / remote DB configuration | Confirm with infrastructure teammate |
| Final timed rehearsal | Team activity scheduled for later |
| Campus-network checks | Two days and one day before presentation |
| Slides and submission | Bring slides/support material on USB; each teammate submits slides |

## Format and authentication notes

The professor's reference uses Swagger 2.0, so `php/Openapi.yaml` uses `host`,
`basePath`, `schemes`, body parameters, and `definitions`. The API contract comes
from `php/README.md`, `php/validation.php`, `php/auth/`, `php/contacts.php`, and
`database/schema.sql`. Step 5 was merged in repository commit `4517dc6`.

Swagger 2.0 has no native `oneOf`, nullable type, or cookie security scheme.
`ContactReadResult` describes the exclusive `contacts`/`contact` envelopes with
examples. Response notes can be null, documented using `x-nullable` and text;
input notes must be strings. Byte limits are described in text because
`maxLength` counts characters.

Protected operations require PHPSESSID, documented in descriptions and
`x-session-required`. This custom extension does not make a client send cookies.
The cookie uses Secure, HttpOnly, and SameSite=Lax. Keep those settings and the
ownership checks intact. The failed SwaggerHub search establishes that the
request lacked a valid session; the specific browser/proxy cause was not verified.
Session troubleshooting is deferred for the selected one-operation demo.

## Infrastructure check

Check at 2026-09-25 03:43 UTC: curl verified HTTPS without disabling certificate
validation. The earlier setup page and API 404s were resolved:

| Request | Observed response |
| --- | --- |
| GET `/` | Redirects to `/login/index.html`; final HTTP 200, Contact Manager login page |
| GET `/php/auth/login.php` | HTTP 405, `{"message":"Method not allowed"}`; login requires POST |
| GET `/php/auth/me.php` | HTTP 401, `{"message":"Not logged in"}` |
| GET `/php/contacts.php` | HTTP 401, `{"message":"Not logged in"}` |

These unauthenticated checks alone do not verify database connectivity or
successful login/search; presenter-reported functional results are recorded above.
An earlier Python urllib check was blocked with Cloudflare 403/error 1010 while
curl reached the server. If a presenter encounters that block, inspect Cloudflare
Security Events for the failing request before changing settings.
