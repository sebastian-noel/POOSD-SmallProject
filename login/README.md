# Login Page

## Files

- `index.html` — page structure
- `styles.css` — styling and layout
- `script.js` — form logic and API integration

## API integration

Update the `API_URL` in `script.js` to match your backend endpoint:

```js
const API_URL = 'http://localhost:5000/api/auth/login';
```

Expected request body:

```json
{
  "email": "user@example.com",
  "password": "yourPassword123"
}
```

Expected successful response shape:

```json
{
  "message": "Login successful",
  "token": "jwt-or-session-token"
}
```

## Run locally

From this folder, start a simple web server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

This page is intentionally flexible so you can swap in a real backend endpoint without changing the UI structure.
