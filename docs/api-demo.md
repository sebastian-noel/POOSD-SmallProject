# SwaggerHub API demonstration

## Deployment status

This revision changes login from email to username and removes user email,
contact address, and contact notes. `php/Openapi.yaml` is version **2.0.0**.
The previously published [SwaggerHub 1.0.0 API](https://app.swaggerhub.com/apis/ucf-7ce/personal-contact-manager/1.0.0)
and earlier successful rehearsals used the old contract. They do not verify this
revision. The live app is [contacts.snoel.dev](https://contacts.snoel.dev); the
API base remains `https://contacts.snoel.dev/php`.

Before presenting, complete [the database/application transition](original-erd-transition.md),
publish the updated specification in SwaggerHub, record its final URL here, and
rehearse on the deployed HTTPS domain. Local testing is not the class demo.

## Selected presentation sequence

Demonstrate **POST `/auth/login.php` only in SwaggerHub**, then show partial
contact search in the web application. That is one demonstrated API operation,
within the assignment's limit of one or two. All eight API operations remain
documented, but only login has the Presentation tag.

## SwaggerHub preparation

1. Import `php/Openapi.yaml` as the updated 2.0.0 definition. Confirm validation
   succeeds and login is the only Presentation operation.
2. Confirm `host: contacts.snoel.dev`, `basePath: /php`, and `schemes: [https]`.
   Requests must target the real domain, not a SwaggerHub mock.
3. Use a dedicated demo account with fake contacts. The fresh seed fixtures use
   usernames Huey and Dewey. Existing accounts keep their usernames/passwords
   after copying; do not reapply seed SQL to an existing deployment.
4. Confirm every presenter can open the updated SwaggerHub URL and the app.

## 1. Login in SwaggerHub

Open **Presentation → POST /auth/login.php → Try it out**. Submit a JSON object:

```json
{
  "username": "Huey",
  "password": "REPLACE_WITH_DEMO_PASSWORD",
  "rememberMe": false
}
```

Expected HTTP 200 body (the ID depends on the account):

```json
{
  "message": "Login successful",
  "user": { "id": 1, "username": "Huey" }
}
```

Point to the real request URL, status code, and JSON result. Optionally repeat
the same operation with an incorrect password: expect HTTP 401 and
`{"message":"Invalid username or password"}`. Do not demonstrate additional
SwaggerHub operations in this sequence.

## 2. Search in the application

Sign in separately in the app; SwaggerHub login does not establish the app's
browser session. With the seeded Huey contacts, search `jo` for Jon Doe and
Joanna Jones, then `oann` to show a substring inside Joanna's name. Search
`zz-no-match-9382` to show no results. Switching to Dewey and searching `jo`
returns John Jones instead of Huey's contacts.

Each search sends an AJAX request to PHP. PHP applies prepared SQL parameters
and filters by the session's user ID. The browser does not perform search by
filtering a cached complete contact list.

## Short presentation script

“Our PHP API connects the browser to our remote MySQL database. I worked on
request validation and integration so the browser receives consistent JSON
results and errors. Our accounts use usernames and hashed passwords, matching
the original database design.

“Here in SwaggerHub, I am calling our deployed login endpoint with a username
and password. A successful request returns HTTP 200 and the user's ID and
username. The password hash is never returned. Login creates a PHP session that
the server uses to identify the user on later requests.

“In the app, each search sends a new request to the server. Searching `oann`
matches Joanna even though it is only part of her name. Every contact query is
restricted to the logged-in user's ID, so another account cannot read, update,
or delete those contacts. The API also validates field types and lengths, and
returns an error if the input is invalid.”

## Rehearsal checklist for this revision

- [ ] Updated app and copied database deployed together on the HTTPS domain.
- [ ] SwaggerHub 2.0.0 published; final URL shared with the team.
- [ ] Username login returns HTTP 200 in SwaggerHub; wrong password returns 401.
- [ ] Registration, login, logout, and contact CRUD work in the app.
- [ ] Partial search, no-match results, and two-account isolation demonstrated.
- [ ] Campus-network checks completed two days and one day before presenting.
- [ ] Timed full-team rehearsal; slides/support files on USB; every member submits.

Protected routes require PHPSESSID. Keep Secure, HttpOnly, SameSite=Lax, and the
ownership checks intact. The old SwaggerHub search attempt returned 401 without
a valid session; this one-operation presentation sequence does not depend on
cross-site authenticated search working in SwaggerHub.
