// Initialize services
const apiService = new ApiService();
const authManager = new AuthManager(apiService);
const toastElement = document.getElementById('toast');
const toastManager = new ToastManager(toastElement);
const uiManager = new UIManager(authManager, apiService);

// Initialize page
uiManager.initializePage();

const clientsTable = document.getElementById('clientsTable');
const feedback = document.getElementById('clientFeedback');
const clientForm = document.getElementById('clientForm');

// Load clients
const loadClients = async () => {
  try {
    const clients = await apiService.getClients();
    clientsTable.innerHTML = clients.map(client => `
      <tr>
        <td>${client.name}</td>
        <td>${client.phone || '-'}</td>
        <td>${client.email || '-'}</td>
        <td>${client.address || '-'}</td>
      </tr>
    `).join('');
  } catch (error) {
    toastManager.error('Erro ao carregar clientes');
  }
};

// Handle form submission
clientForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = '';

  const client = {
    name: document.getElementById('clientName').value.trim(),
    phone: document.getElementById('clientPhone').value.trim(),
    email: document.getElementById('clientEmail').value.trim(),
    address: document.getElementById('clientAddress').value.trim(),
    notes: document.getElementById('clientNotes').value.trim()
  };

  try {
    await apiService.createClient(client);
    toastManager.success('Cliente cadastrado com sucesso!');
    clientForm.reset();
    await loadClients();
  } catch (error) {
    toastManager.error(error.message);
  }
});

// Event listeners
document.getElementById('refreshClients').addEventListener('click', async () => {
  await loadClients();
  toastManager.success('Clientes atualizados!');
});

// Load on page load
loadClients();
