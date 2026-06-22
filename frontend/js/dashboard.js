// Initialize services
const apiService = new ApiService();
const authManager = new AuthManager(apiService);
const toastElement = document.getElementById('toast');
const toastManager = new ToastManager(toastElement);
const uiManager = new UIManager(authManager, apiService);

// Initialize page
uiManager.initializePage();

const userName = document.getElementById('userName');
const ordersOpen = document.getElementById('ordersOpen');
const ordersClosed = document.getElementById('ordersClosed');
const revenue = document.getElementById('revenue');
const activeClients = document.getElementById('activeClients');
const ordersSummary = document.getElementById('ordersSummary');

function statusClass(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Load dashboard data
const loadDashboard = async () => {
  try {
    const data = await apiService.getDashboard();
    ordersOpen.textContent = data.ordersOpen;
    ordersClosed.textContent = data.ordersClosed;
    revenue.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.revenue);
    activeClients.textContent = data.activeClients;
  } catch (error) {
    toastManager.error('Erro ao carregar dashboard');
  }
};

// Load recent orders
const loadRecentOrders = async () => {
  try {
    const ordens = await apiService.getOrders();
    ordersSummary.innerHTML = ordens.slice(0, 5).map(ordem => `
      <tr>
        <td>${ordem.id}</td>
        <td>${ordem.client || '-'}</td>
        <td><span class="status-badge status-${statusClass(ordem.status)}">${ordem.status}</span></td>
        <td>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ordem.total)}</td>
      </tr>
    `).join('');
  } catch (error) {
    toastManager.error('Erro ao carregar ordens');
  }
};

// Event listeners
document.getElementById('refreshDashboard').addEventListener('click', async () => {
  await loadDashboard();
  await loadRecentOrders();
  toastManager.success('Dashboard atualizado!');
});

// Load on page load
loadDashboard();
loadRecentOrders();
