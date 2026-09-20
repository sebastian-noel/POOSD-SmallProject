const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000/api/auth/login';

const form = document.getElementById('contactForm');
const submitButton = document.getElementById('submitButton');
const buttonText = submitButton.querySelector('.btn-text');
const messageBox = document.getElementById('formMessage');

function setMessage(text, type = '') {
  messageBox.textContent = text;
  messageBox.className = 'form-message';

  if (type) {
    messageBox.classList.add(type);
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  buttonText.textContent = isLoading ? 'Signing in...' : 'Sign in';
}

async function loginUser(payload) {
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
    throw new Error(data.message || 'Login failed. Please try again.');
  }

  return data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  if (!email || !password) {
    setMessage('Please enter both your email and password.', 'error');
    return;
  }

  setLoading(true);
  setMessage('');

  try {
    const result = await loginUser({ email, password, rememberMe });
    setMessage(result.message || 'Login successful. Redirecting...', 'success');

    if (result.token) {
      localStorage.setItem('authToken', result.token);
    }

    window.setTimeout(() => {
      // Replace this with your app route when backend is connected.
      console.log('Authenticated user:', result);
    }, 600);
  } catch (error) {
    setMessage(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});