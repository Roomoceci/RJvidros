class AuthManager {
  constructor(apiService) {
    this.apiService = apiService;
  }

  async login(email, password) {
    try {
      const response = await this.apiService.login(email, password);
      this.setUser(response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  setUser(user) {
    localStorage.setItem('rjvidros_token', user.token);
    localStorage.setItem('rjvidros_user', user.name);
    localStorage.setItem('rjvidros_email', user.email);
  }

  getUser() {
    return {
      token: localStorage.getItem('rjvidros_token'),
      name: localStorage.getItem('rjvidros_user'),
      email: localStorage.getItem('rjvidros_email')
    };
  }

  isAuthenticated() {
    return !!localStorage.getItem('rjvidros_token');
  }

  logout() {
    localStorage.removeItem('rjvidros_token');
    localStorage.removeItem('rjvidros_user');
    localStorage.removeItem('rjvidros_email');
  }

  redirectIfNotAuthenticated() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
    }
  }

  redirectIfAuthenticated() {
    if (this.isAuthenticated()) {
      window.location.href = 'dashboard.html';
    }
  }
}
