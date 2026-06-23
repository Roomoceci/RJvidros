// Initialize services
const apiService = new ApiService();
const authManager = new AuthManager(apiService);
const toastElement = document.getElementById('toast');
const toastManager = new ToastManager(toastElement);
const uiManager = new UIManager(authManager, apiService);

// Initialize page
uiManager.initializePage();

// State
let currentRequestId = null;
let allRequests = [];
let activeTechnicians = [];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function statusClass(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Elements
const requestsTable = document.getElementById('requestsTable');
const filterStatus = document.getElementById('filterStatus');
const refreshRequests = document.getElementById('refreshRequests');
const requestModal = document.getElementById('requestModal');
const statusSelect = document.getElementById('statusSelect');
const convertToOrderBtn = document.getElementById('convertToOrderBtn');
const orderTechnicianSelect = document.getElementById('orderTechnicianSelect');
const orderTotalInput = document.getElementById('orderTotalInput');

function authHeaders(extraHeaders = {}) {
  return {
    ...extraHeaders,
    'Authorization': `Bearer ${apiService.getToken()}`
  };
}

async function loadRequests() {
  try {
    const response = await fetch('/api/solicitacoes', {
      headers: authHeaders()
    });
    if (!response.ok) throw new Error('Erro ao carregar solicitações');
    allRequests = await response.json();
    renderRequests(allRequests);
    updateStats();
  } catch (error) {
    toastManager.error('Erro ao carregar solicitações');
  }
}

async function loadActiveTechnicians() {
  try {
    activeTechnicians = await apiService.getActiveTechnicians();
    renderTechnicianOptions();
  } catch (error) {
    activeTechnicians = [];
    renderTechnicianOptions();
    toastManager.error('Erro ao carregar técnicos ativos');
  }
}

function renderTechnicianOptions() {
  orderTechnicianSelect.innerHTML = '<option value="">A definir</option>' +
    activeTechnicians
      .map(tech => `<option value="${tech.id}">${escapeHtml(tech.name)}</option>`)
      .join('');
}

function renderRequests(requests) {
  requestsTable.innerHTML = requests.map(req => `
    <tr>
      <td>${req.id}</td>
      <td>${escapeHtml(req.client_name)}</td>
      <td>${escapeHtml(req.client_phone)}</td>
      <td>${escapeHtml(req.service_type)}</td>
      <td><span class="status-badge status-${statusClass(req.status)}">${escapeHtml(req.status)}</span></td>
      <td>${new Date(req.created_at).toLocaleDateString('pt-BR')}</td>
      <td>
        <button class="btn btn-primary" style="padding: 5px 12px; font-size: 0.85rem;" onclick="openRequestModal(${req.id})">Ver</button>
      </td>
    </tr>
  `).join('');
}

async function openRequestModal(requestId) {
  try {
    const response = await fetch(`/api/solicitacoes/${requestId}`, {
      headers: authHeaders()
    });
    if (!response.ok) throw new Error('Erro ao carregar detalhes');
    const request = await response.json();

    currentRequestId = request.id;
    statusSelect.value = request.status;

    const cannotConvert = ['cancelada', 'agendada', 'concluída'].includes(statusClass(request.status));
    convertToOrderBtn.disabled = cannotConvert;
    orderTechnicianSelect.value = '';
    orderTechnicianSelect.disabled = cannotConvert;
    orderTotalInput.value = '';
    orderTotalInput.disabled = cannotConvert;

    document.getElementById('modalClientName').textContent = request.client_name;
    document.getElementById('modalClientPhone').textContent = request.client_phone;
    document.getElementById('modalClientEmail').textContent = request.client_email;
    document.getElementById('modalServiceType').textContent = request.service_type;
    document.getElementById('modalPreferredDate').textContent = request.preferred_date ? new Date(request.preferred_date).toLocaleDateString('pt-BR') : 'Não especificada';
    document.getElementById('modalCreatedAt').textContent = new Date(request.created_at).toLocaleDateString('pt-BR');
    document.getElementById('modalAddress').textContent = request.address;
    document.getElementById('modalDescription').textContent = request.description;
    document.getElementById('modalNotes').textContent = request.notes || 'Nenhuma observação';
    document.getElementById('modalStatus').textContent = request.status;

    requestModal.classList.add('active');
    requestModal.setAttribute('aria-hidden', 'false');
  } catch (error) {
    toastManager.error('Erro ao carregar detalhes');
  }
}

function closeRequestModal() {
  requestModal.classList.remove('active');
  requestModal.setAttribute('aria-hidden', 'true');
  currentRequestId = null;
}

async function updateRequestStatus() {
  if (!currentRequestId) return;

  try {
    const response = await fetch(`/api/solicitacoes/${currentRequestId}/status`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status: statusSelect.value })
    });

    if (!response.ok) throw new Error('Erro ao atualizar');

    toastManager.success('Status atualizado com sucesso!');
    closeRequestModal();
    await loadRequests();
  } catch (error) {
    toastManager.error(error.message);
  }
}

async function convertRequestToOrder() {
  if (!currentRequestId) return;

  const total = Number(orderTotalInput.value || 0);
  if (Number.isNaN(total) || total < 0) {
    toastManager.error('Informe um valor válido para a OS');
    orderTotalInput.focus();
    return;
  }

  const selectedTechnician = activeTechnicians.find(tech => String(tech.id) === orderTechnicianSelect.value);
  const technicianLabel = selectedTechnician ? selectedTechnician.name : 'A definir';
  const confirmMessage = [
    'Gerar uma Ordem de Serviço a partir desta solicitação?',
    `Técnico: ${technicianLabel}`,
    `Valor: ${currencyFormatter.format(total)}`
  ].join('\n');

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    convertToOrderBtn.disabled = true;
    const result = await apiService.convertRequestToOrder(currentRequestId, {
      technician_id: orderTechnicianSelect.value ? Number(orderTechnicianSelect.value) : null,
      total
    });
    toastManager.success(`OS #${result.order_id} criada com sucesso`);
    closeRequestModal();
    await loadRequests();
  } catch (error) {
    convertToOrderBtn.disabled = false;
    toastManager.error(error.message);
  }
}

function filterByStatus() {
  const status = filterStatus.value;
  if (!status) {
    renderRequests(allRequests);
  } else {
    const filtered = allRequests.filter(req => req.status === status);
    renderRequests(filtered);
  }
}

function updateStats() {
  const pending = allRequests.filter(r => r.status === 'Pendente').length;
  const approved = allRequests.filter(r => r.status === 'Aprovada').length;
  const scheduled = allRequests.filter(r => r.status === 'Agendada').length;

  document.getElementById('pendingCount').textContent = pending;
  document.getElementById('approvedCount').textContent = approved;
  document.getElementById('scheduledCount').textContent = scheduled;
  document.getElementById('totalCount').textContent = allRequests.length;
}

filterStatus.addEventListener('change', filterByStatus);

refreshRequests.addEventListener('click', async () => {
  await loadRequests();
  toastManager.success('Solicitações atualizadas!');
});

document.getElementById('printButton').addEventListener('click', () => {
  const printWindow = window.open('', '_blank');
  const table = document.querySelector('table');
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <title>Solicitações de Serviço</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #222; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #2563eb; color: white; }
        .print-date { margin-top: 20px; text-align: center; color: #666; font-size: 0.9rem; }
      </style>
    </head>
    <body>
      <h1>Relatório de Solicitações</h1>
      ${table.outerHTML}
      <div class="print-date">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
});

requestModal.addEventListener('click', (event) => {
  if (event.target === requestModal) {
    closeRequestModal();
  }
});

window.openRequestModal = openRequestModal;
window.closeRequestModal = closeRequestModal;
window.updateRequestStatus = updateRequestStatus;
window.convertRequestToOrder = convertRequestToOrder;

loadRequests();
loadActiveTechnicians();
