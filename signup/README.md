# Sign Up Page

## Files

- `index.html` — page structure
- `styles.css` — styling and layout (shared look with the login page)
- `script.js` — form logic and API integration

## API integration

Update the `API_URL` in `script.js` to match your backend endpoint:

```js
const API_URL = 'http://localhost:5000/api/auth/register';
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

## Run locally

From this folder, start a simple web server:

```bash
python -m http.server 8001
```

Then open:

```text
http://localhost:8001
```

