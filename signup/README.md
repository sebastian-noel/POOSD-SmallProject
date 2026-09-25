# Sign Up Page

## Files

- `index.html` — page structure
- `../assets/ui.css` and `../assets/auth.css` — shared controls and authentication layout
- `../assets/forms.js` — password visibility and accessible validation states
- `script.js` — form logic and API integration

## API integration

The default URL reaches PHP on the same origin:

```js
const API_URL = window.APP_CONFIG?.API_URL || '../php/auth/register.php';
```

Matches the existing `php/auth/register.php` endpoint contract.

Expected request body:

```json
{
  "username": "yourusername",
  "email": "user@example.com",
  "password": "yourPassword123"
}
```

Expected successful response shape:

```json
{
  "message": "Account created",
  "user": {
    "id": 1,
    "username": "yourusername",
    "email": "user@example.com"
  }
}
```

On success, the page redirects to `../login/index.html`.

Serve the repository root through Apache/PHP with the configured database and
HTTPS on the deployed domain. A static file server alone cannot execute the API.
Registration creates the account; the user then signs in to establish a session.
