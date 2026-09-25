# Contacts
Add, search, edit, list, delete contacts

## Files

- `contacts.html` — page structure, responsive table, search toolbar, inline editor, and delete confirmation
- `styles.css` — responsive contacts layout
- `../assets/ui.css` and `../assets/forms.js` — shared controls and validation states
- `script.js` — form logic and API integration (api calls, table rendering, behaviors)

## API Integration

You may update the `API_URL` in `script.js` to match your backend endpoint:

```javascript
const API_URL = window.APP_CONFIG?.API_URL || '../php/contacts.php';
const AUTH_BASE_URL = window.APP_CONFIG?.AUTH_BASE_URL || '../php/auth';
```

The dashboard calls `GET {AUTH_BASE_URL}/me.php` before displaying contacts and
when restored from the browser's Back/Forward cache. A 401 returns the user to
login. A failed session check keeps the dashboard hidden with a retry message.
Logout calls `POST {AUTH_BASE_URL}/logout.php`; a failed logout keeps the user on
the dashboard and displays an error. The deployed frontend and API share one
HTTPS origin and authenticate with the HttpOnly PHP session cookie.
## Endpoints
Every request is accessed through the user's server-side. One user cannot alter another users contact page.

Search runs on Enter or the Search button and always queries the server. Clear
returns to all contacts. The current search stays active after saves and deletes;
older search responses cannot overwrite newer results.
| Method | URL | What it does |
|---|---|---|
| `GET` | `{API_URL}` | Get all my contacts |
| `GET` | `{API_URL}?id=5` | Get one contact |
| `GET` | `{API_URL}?search=term` | Search (matches part of first/last name, email, or phone) |
| `POST` | `{API_URL}` | Add a contact |
| `PUT` | `{API_URL}?id=5` | Update a contact |
| `DELETE` | `{API_URL}?id=5` | Delete a contact |

### Expected Request Body
The first and last name are required & the email is required to be a real email if filled in, other inputs are optional.

```json
{
	"first_name": "Jane",
	"last_name": "Doe",
	"email": "jane@example.com",
	"phone": "555-0100",
	"address": "123 Main St",
	"notes": "met at conference"
}
```

### Expected Successful Response Shape

GET (list or search):
```json
{ "contacts": [ { "id": 1, "first_name": "Jane", "last_name": "Doe", "email": "...", "phone": "...", "address": "...", "notes": "...", "created_at": "...", "updated_at": "..." } ] }
```

GET (one contact):
```json
{ "contact": { "id": 5, "first_name": "...", "last_name": "...", "email": "...", "phone": "...", "address": "...", "notes": "...", "created_at": "...", "updated_at": "..." } }
```

POST (201) / PUT (200):
```json
{ "message": "Contact created", "contact": { "id": 1, "first_name": "...", "last_name": "...", "created_at": "...", "updated_at": "..." } }
```

DELETE (200):
```json
{ "message": "Contact deleted" }
```

Anything that goes wrong (400 / 404 / 405):
```json
{ "message": "..." }
```

## Saving contacts

Add and edit use the same save flow. First and last name must contain text;
email and phone are optional. If an email is supplied, the form checks its format.
Input length limits match the database columns. These browser checks do not
replace validation in the API.

While a save is pending, the form controls are disabled to prevent duplicate
submissions. The inline editor closes and clears only after a successful response confirms
the saved contact. Server errors, invalid responses, network failures, and a
15-second timeout keep the entries visible for correction or retry. A successful
save refreshes the table and displays a confirmation on the dashboard.

Creation and update timestamps come from the server; they are not editable form
fields. Contact values are rendered as text, so names containing HTML characters
are displayed literally.

Run the focused save-flow regression tests from the repository root with Node.js
18 or newer (Node.js is only needed for these tests, not to host the application):

```sh
node --test tests/contact-save.test.cjs
```

These tests use simulated DOM elements and HTTP responses to cover input
preservation, pending submissions, retries, and text rendering. Browser and
PHP/MySQL integration checks are separate.

## Running the application

Serve the repository root through Apache/PHP with the configured database. Open
the domain root to log in or register. A static file server alone cannot execute
the API; use HTTPS on the deployed domain for the Secure session cookie.
