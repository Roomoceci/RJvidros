class ApiService {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('rjvidros_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('rjvidros_token', token);
  }

  getToken() {
    return this.token || localStorage.getItem('rjvidros_token');
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('rjvidros_token');
          localStorage.removeItem('rjvidros_user');
          localStorage.removeItem('rjvidros_email');
          if (!window.location.pathname.endsWith('/login.html')) {
            window.location.href = 'login.html';
          }
        }
        throw new Error(result.error || `Erro ${response.status}`);
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  async get(endpoint) {
    return this.request('GET', endpoint);
  }

  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  async put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  }

  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

  async login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  async getClients() {
    return this.get('/clientes');
  }

  async createClient(data) {
    return this.post('/clientes', data);
  }

  async getTechnicians() {
    return this.get('/tecnicos');
  }

  async getActiveTechnicians() {
    return this.get('/tecnicos/ativos');
  }

  async createTechnician(data) {
    return this.post('/tecnicos', data);
  }

  async getOrders() {
    return this.get('/ordens');
  }

  async getOpenOrders() {
    return this.get('/ordens/abertas');
  }

  async getClosedOrders() {
    return this.get('/ordens/concluidas');
  }

  async createOrder(data) {
    return this.post('/ordens', data);
  }

  async finalizeOrderAsPaid(id) {
    return this.put(`/ordens/${id}/finalizar-pago`, {});
  }

  async getDashboard() {
    return this.get('/dashboard');
  }

  async getPublicConfig() {
    return this.get('/config/public');
  }

  async convertRequestToOrder(id, data = {}) {
    return this.post(`/solicitacoes/${id}/gerar-os`, data);
  }

  async getFinanceSummary() {
    return this.get('/financeiro/resumo');
  }

  async getFinanceReport() {
    return this.get('/relatorios/financeiro');
  }

  async getClientReport() {
    return this.get('/relatorios/clientes');
  }

  async getTechnicianReport() {
    return this.get('/relatorios/tecnicos');
  }
}
