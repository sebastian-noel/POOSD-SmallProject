# Login Page

## Files

- `index.html` — page structure
- `../assets/ui.css` and `../assets/auth.css` — shared controls and authentication layout
- `../assets/forms.js` — password visibility and accessible validation states
- `script.js` — form logic and API integration

## API integration

The default URL reaches PHP on the same origin:

```js
const API_URL = window.APP_CONFIG?.API_URL || '../php/auth/login.php';
```

Expected request body:

```json
{
  "email": "user@example.com",
  "password": "yourPassword123",
  "rememberMe": true
}
```

Expected successful response shape:

```json
{
  "message": "Login successful",
  "user": { "id": 1, "username": "Huey", "email": "huey@example.com" }
}
```

Authentication uses the HttpOnly PHP session cookie; there is no token to save in
localStorage. On success the browser opens `../contacts/contacts.html`. The
dashboard verifies the session before loading contacts. Logout calls PHP and
expires the session cookie before returning here.

Serve the repository root through Apache with PHP and the configured MySQL
database. The root `index.php` redirects to this login page. Use HTTPS on the
deployed domain because the session cookie is Secure. A static file server alone
cannot execute the API. If a deployment overrides `APP_CONFIG.API_URL`, define it
before loading `script.js` and configure the other pages consistently.
