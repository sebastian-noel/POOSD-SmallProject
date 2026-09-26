// Backend endpoint; can be overridden with window.APP_CONFIG.API_URL
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000/api/auth/register';

// Page elements
const form = document.getElementById('signupForm');
const submitButton = document.getElementById('submitButton');
const buttonText = submitButton.querySelector('.btn-text');
const messageBox = document.getElementById('formMessage');

// Shows a message under the form (type is 'success' or 'error')
function setMessage(text, type = '') {
  messageBox.textContent = text;
  messageBox.className = 'form-message';

  if (type) {
    messageBox.classList.add(type);
  }
}

// Disables the button and changes its text while the request runs
function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  buttonText.textContent = isLoading ? 'Creating account...' : 'Create account';
}

// Sends the form data to the API and returns the JSON response
async function registerUser(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Account creation failed. Please try again.');
  }

  return data;
}

// Handle form submit: validate, register, then go to the login page
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Make sure every field is filled in
  if (!username || !email || !password) {
    setMessage('Please fill in username, email, and password.', 'error');
    return;
  }

  // Enforce the minimum password length
  if (password.length < 8) {
    setMessage('Password must be at least 8 characters.', 'error');
    return;
  }

  setLoading(true);
  setMessage('');

  try {
    const result = await registerUser({ username, email, password });
    setMessage(result.message || 'Account created. Redirecting to login...', 'success');

    // Send the user to the login page after a short delay
    window.setTimeout(() => {
      window.location.href = '../login/index.html';
    }, 900);
  } catch (error) {
    setMessage(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});
