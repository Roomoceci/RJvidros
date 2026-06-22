// Initialize services
const apiService = new ApiService();
const authManager = new AuthManager(apiService);
const toastElement = document.getElementById('toast');
const toastManager = new ToastManager(toastElement);
const uiManager = new UIManager(authManager, apiService);

// Initialize page
uiManager.initializePage();

const techTable = document.getElementById('techTable');
const techForm = document.getElementById('techForm');
const techFeedback = document.getElementById('techFeedback');

function statusClass(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Load technicians
const loadTechnicians = async () => {
  try {
    const technicians = await apiService.getTechnicians();
    techTable.innerHTML = technicians.map(tech => `
      <tr>
        <td>${tech.id}</td>
        <td>${tech.name}</td>
        <td>${tech.phone || '-'}</td>
        <td>${tech.email}</td>
        <td>${tech.specialty || '-'}</td>
        <td><span class="status-badge status-${statusClass(tech.status)}">${tech.status}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    toastManager.error('Erro ao carregar técnicos');
  }
};

// Handle form submission
techForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  techFeedback.textContent = '';

  const technician = {
    name: document.getElementById('techName').value.trim(),
    phone: document.getElementById('techPhone').value.trim(),
    email: document.getElementById('techEmail').value.trim(),
    specialty: document.getElementById('techSpecialty').value.trim(),
    status: document.getElementById('techStatus').value,
    notes: document.getElementById('techNotes').value.trim()
  };

  try {
    await apiService.createTechnician(technician);
    toastManager.success('Técnico cadastrado com sucesso!');
    techForm.reset();
    await loadTechnicians();
  } catch (error) {
    toastManager.error(error.message);
  }
});

// Event listeners
document.getElementById('refreshTecnicos').addEventListener('click', async () => {
  await loadTechnicians();
  toastManager.success('Técnicos atualizado!');
});

// Load on page load
loadTechnicians();
