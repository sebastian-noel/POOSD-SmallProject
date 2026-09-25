const API_URL = window.APP_CONFIG?.API_URL || '../php/auth/register.php';

const form = document.getElementById('signupForm');
const submitButton = document.getElementById('submitButton');
const buttonText = submitButton.querySelector('.btn-text');
const messageBox = document.getElementById('formMessage');

function setMessage(text, type = '') {
  messageBox.textContent = text;
  messageBox.className = 'form-message';

  if (type) {
    messageBox.classList.add(type);
    if (type === 'error') messageBox.focus();
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.setAttribute('aria-busy', String(isLoading));
  form.setAttribute('aria-busy', String(isLoading));
  buttonText.textContent = isLoading ? 'Creating account...' : 'Create account';
}

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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  setMessage('');
  if (!form.reportValidity()) return;

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !email || !password) {
    setMessage('Please fill in username, email, and password.', 'error');
    return;
  }

  if ([...password].length < 8) {
    setMessage('Password must be at least 8 characters.', 'error');
    return;
  }

  if (new TextEncoder().encode(password).length > 72) {
    setMessage('Please use a password of 72 bytes or fewer. Some characters use more than one byte.', 'error');
    return;
  }

  setLoading(true);
  setMessage('');

  try {
    const result = await registerUser({ username, email, password });
    setMessage(result.message || 'Account created. Redirecting to login...', 'success');

    window.setTimeout(() => {
      window.location.href = '../login/index.html';
    }, 900);
  } catch (error) {
    setMessage(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});
