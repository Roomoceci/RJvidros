class UIManager {
  constructor(authManager, apiService) {
    this.authManager = authManager;
    this.apiService = apiService;
  }

  initializePage() {
    this.authManager.redirectIfNotAuthenticated();
    this.setupDarkMode();
    this.setupUserGreeting();
    this.setupLogoutButtons();
    this.setupThemeToggle();
    this.setActiveNavLink();
  }

  setupDarkMode() {
    if (localStorage.getItem('dark-mode') === 'true') {
      document.body.classList.add('dark-mode');
    }
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode'));
      });
    }
  }

  setupUserGreeting() {
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting) {
      const user = this.authManager.getUser();
      userGreeting.textContent = `Bem-vindo, ${user.name || 'Usuário'}!`;
    }
  }

  setupLogoutButtons() {
    const logoutButton = document.getElementById('logoutButton');
    const sidebarLogout = document.getElementById('sidebarLogout');

    const handleLogout = () => {
      this.authManager.logout();
      window.location.href = 'login.html';
    };

    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    if (sidebarLogout) sidebarLogout.addEventListener('click', handleLogout);
  }

  setActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPage = window.location.pathname.split('/').pop() || 'login.html';

    navLinks.forEach(link => {
      const linkPage = link.getAttribute('href');
      if (linkPage === currentPage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  showError(message) {
    console.error(message);
  }

  showSuccess(message) {
    console.log('S&', message);
  }
}
