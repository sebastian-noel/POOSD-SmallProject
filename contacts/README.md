# Contacts
Add, search, edit, list, delete contacts

## Files

- `contacts.html` — page structure (inc. table, toolbar, add contact popup)
- `styles.css` — styling and layout
- `script.js` — form logic and API integration (api calls, table rendering, behaviors)

## API Integration

Update the `API_URL` in `script.js` to match your backend endpoint:

```javascript
const API_URL = 'http://localhost:5000/api/contacts';
```
##Endpoints
Every request is accessed through the user's server-side. One user cannot alter another users contact page.
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

Note: The search will only run when you hit enter. This is intentional, auto-fill is something to note in later updates.
```json
{
	"firstName": "Jane",
	"lastName": "Doe",
	"email": "jane@example.com",
	"phone": "555-0100",
	"address": "123 Main St",
	"notes": "met at conference",
	"dateCreated": "2026-09-23"
}
```

### Expected Successful Response Shape
```json
{
  // GET (list or search)
	{ "contacts": [ { "id": 1, "first_name": "Jane", "last_name": "Doe", "email": "...", "phone": "...", "address": "...", "notes": "...", "date_created": "..." } ] }

	// GET (one contact)
	{ "contact": { "id": 5, "first_name": "...", ... } }

	// POST (201) / PUT (200)
	{ "message": "Contact created", "contact": { ...the new or updated contact... } }

	// DELETE (200)
	{ "message": "Contact deleted" }

	// Anything that goes wrong (400 / 404 / 405)
	{ "message": "..." }
}
```

## Run Locally

From this folder, start a simple web server:

```bash
python -m http.server 8000
```

Then open: http://localhost:8000