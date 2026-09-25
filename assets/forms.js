// Shared, progressively enhanced controls. Native form validation stays active.
document.querySelectorAll('[data-password-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    button.textContent = showing ? 'Hide' : 'Show';
    button.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
    button.setAttribute('aria-pressed', String(showing));
  });
});
document.querySelectorAll('form').forEach(form => {
  form.addEventListener('invalid', event => event.target.setAttribute('aria-invalid', 'true'), true);
  form.addEventListener('input', event => {
    if (event.target.matches('input, textarea')) event.target.removeAttribute('aria-invalid');
  });
  form.addEventListener('reset', () => {
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  });
});
