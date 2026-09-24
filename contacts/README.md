# Contacts
Add, search, edit, list, delete contacts

## Files

- `contacts.html` — page structure (inc. table, toolbar, add contact popup)
- `styles.css` — styling and layout
- `script.js` — form logic and API integration (api calls, table rendering, behaviors)

## API Integration

You may update the `API_URL` in `script.js` to match your backend endpoint:

```javascript
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000/api/contacts';
```
## Endpoints
Every request is accessed through the user's server-side. One user cannot alter another users contact page.

Note: The search will only run when you hit enter. This is intentional, auto-fill is something to note in later updates.
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
	"notes": "met at conference",
	"date_created": "2026-09-23"
}
```

### Expected Successful Response Shape

GET (list or search):
​```json
{ "contacts": [ { "id": 1, "first_name": "Jane", "last_name": "Doe", "email": "...", "phone": "...", "address": "...", "notes": "...", "date_created": "..." } ] }
​```

GET (one contact):
​```json
{ "contact": { "id": 5, "first_name": "...", "last_name": "...", "email": "...", "phone": "...", "address": "...", "notes": "...", "date_created": "..." } }
​```

POST (201) / PUT (200):
​```json
{ "message": "Contact created", "contact": { "id": 1, "first_name": "...", "last_name": "...", "..." } }
​```

DELETE (200):
​```json
{ "message": "Contact deleted" }
​```

Anything that goes wrong (400 / 404 / 405):
​```json
{ "message": "..." }
​```

## Run Locally

From this folder, start a simple web server:

```bash
python -m http.server 8000
```

Then open: http://localhost:8000