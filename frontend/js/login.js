// Initialize services
const apiService = new ApiService();
const authManager = new AuthManager(apiService);

const form = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

// Check if already authenticated
authManager.redirectIfAuthenticated();

// Dark mode persistence
if (localStorage.getItem('dark-mode') === 'true') {
  document.body.classList.add('dark-mode');
}

// Theme toggle
document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode'));
  });
});

// Form submission
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Carregando...';
  submitButton.disabled = true;

  try {
    const response = await authManager.login(email, password);
    window.location.href = 'dashboard.html';
  } catch (error) {
    errorMessage.textContent = error.message;
    submitButton.textContent = originalText;
    submitButton.disabled = false;
  }
});

