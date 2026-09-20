# Contacts

WIP: This file is currently unfinished.

## Files

- `contacts.html` — page structure
- `styles.css` — styling and layout
- `script.js` — form logic and API integration

## API Integration

Update the `API_URL` in `script.js` to match your backend endpoint:

```javascript
const API_URL = 'http://localhost:5000/api/contacts';
```

### Expected Request Body
```json
{
  "userId": 1,
  "search": ""
}
```

### Expected Successful Response Shape
```json
{
  "results": [],
  "error": ""
}
```

## Run Locally

From this folder, start a simple web server:

```bash
python -m http.server 8000
```

Then open: http://localhost:8000